"""REST API routes.

Every diagnostic value returned here is computed by the engine
(``app.engine.diagnostics``); nothing is hardcoded. Unknown ids return 404.
There is no authentication (prototype scope).
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.data_store import DataStore, get_store, reset_store
from app.engine import diagnostics
from app.engine.config import load_thresholds
from app.models.domain import (
    Assessment,
    AssessmentItem,
    MisconceptionResponseMapping,
    MisconceptionState,
    ResponseOption,
)
from app.models.schemas import (
    ApplyRepairResult,
    AssessmentAudit,
    AssessmentSummary,
    DiagnosticAnalysis,
    ItemAuditSummary,
    ObservedDistribution,
    RepairRecommendation,
    ThresholdConfig,
)

router = APIRouter(prefix="/api")

# Fixed timestamp label for the deterministic prototype (no wall-clock leaks
# into diagnostic output; this is only presentational).
_ANALYZED_AT = "seeded-demo"


def store_dep() -> DataStore:
    return get_store()


# ---- health -------------------------------------------------------------


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "assessment-auditor"}


# ---- config -------------------------------------------------------------


@router.get("/config/thresholds", response_model=ThresholdConfig)
def get_threshold_config() -> ThresholdConfig:
    """Expose the heuristic band cut-offs so the frontend labels bands using
    the same thresholds as the engine (no hardcoded cut-offs in React)."""
    thresholds = load_thresholds()
    return ThresholdConfig(
        high_threshold=thresholds.high_threshold,
        medium_threshold=thresholds.medium_threshold,
        label=thresholds.label,
    )


# ---- states & mappings (misconception map screen) -----------------------


@router.get("/states", response_model=list[MisconceptionState])
def list_states(store: DataStore = Depends(store_dep)) -> list[MisconceptionState]:
    return store.states


@router.get("/items/{item_id}/mappings", response_model=MisconceptionResponseMapping)
def get_item_mappings(
    item_id: str, store: DataStore = Depends(store_dep)
) -> MisconceptionResponseMapping:
    mapping = store.get_mapping(item_id)
    if mapping is None:
        raise HTTPException(status_code=404, detail=f"No mapping for item '{item_id}'.")
    return mapping


# ---- assessments --------------------------------------------------------


def _assessment_audit(store: DataStore, assessment: Assessment) -> AssessmentAudit:
    thresholds = load_thresholds()
    summaries: list[ItemAuditSummary] = []
    band_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    low_power_item_count = 0
    for item in assessment.items:
        dist = store.get_distributions(item.id)
        if dist is None:
            continue
        analysis = diagnostics.analyze_item(item, dist, thresholds)
        band_counts[analysis.power_band] += 1
        if analysis.power_band == "LOW":
            low_power_item_count += 1
        summaries.append(
            ItemAuditSummary(
                item_id=item.id,
                question=item.question,
                overall_separability=analysis.overall_separability,
                power_band=analysis.power_band,
                weakest_pair=analysis.weakest_pair,
            )
        )
    return AssessmentAudit(
        assessment_id=assessment.id,
        title=assessment.title,
        domain=assessment.domain,
        item_count=len(assessment.items),
        items=summaries,
        band_counts=band_counts,
        low_power_item_count=low_power_item_count,
    )


@router.get("/assessments", response_model=list[AssessmentSummary])
def list_assessments(store: DataStore = Depends(store_dep)) -> list[AssessmentSummary]:
    audit = _assessment_audit(store, store.assessment)
    return [
        AssessmentSummary(
            id=store.assessment.id,
            title=store.assessment.title,
            domain=store.assessment.domain,
            item_count=audit.item_count,
            audit_status="analyzed",
            low_power_item_count=audit.low_power_item_count,
            last_analyzed=_ANALYZED_AT,
        )
    ]


@router.get("/assessments/{assessment_id}", response_model=Assessment)
def get_assessment(
    assessment_id: str, store: DataStore = Depends(store_dep)
) -> Assessment:
    assessment = store.get_assessment(assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assessment '{assessment_id}'."
        )
    return assessment


@router.get("/assessments/{assessment_id}/audit", response_model=AssessmentAudit)
def audit_assessment(
    assessment_id: str, store: DataStore = Depends(store_dep)
) -> AssessmentAudit:
    assessment = store.get_assessment(assessment_id)
    if assessment is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown assessment '{assessment_id}'."
        )
    return _assessment_audit(store, assessment)


# ---- item audit ---------------------------------------------------------


def _observed_distribution(store: DataStore, item_id: str) -> ObservedDistribution | None:
    raw = store.get_responses(item_id)
    if raw is None:
        return None
    counts = {k: int(v) for k, v in raw["counts"].items()}
    total = int(raw.get("totalResponses", sum(counts.values())))
    proportions = {
        k: (v / total if total else 0.0) for k, v in counts.items()
    }
    return ObservedDistribution(
        item_id=item_id,
        total_responses=total,
        counts=counts,
        proportions=proportions,
        label=store.responses_label,
    )


@router.get("/items/{item_id}/audit")
def audit_item(item_id: str, store: DataStore = Depends(store_dep)) -> dict:
    item = store.get_item(item_id)
    dist = store.get_distributions(item_id)
    if item is None or dist is None:
        raise HTTPException(status_code=404, detail=f"Unknown item '{item_id}'.")
    analysis: DiagnosticAnalysis = diagnostics.analyze_item(item, dist)
    observed = _observed_distribution(store, item_id)
    return {
        "analysis": analysis.model_dump(),
        "mapping": {"itemId": item_id, "distributions": dist},
        "observed": observed.model_dump() if observed else None,
        "item": item.model_dump(),
    }


# ---- candidate repairs --------------------------------------------------


@router.get("/items/{item_id}/candidates", response_model=RepairRecommendation)
def item_candidates(
    item_id: str, store: DataStore = Depends(store_dep)
) -> RepairRecommendation:
    item = store.get_item(item_id)
    dist = store.get_distributions(item_id)
    if item is None or dist is None:
        raise HTTPException(status_code=404, detail=f"Unknown item '{item_id}'.")
    return diagnostics.recommend_best_repair(item, dist, store.candidates)


# ---- apply repair -------------------------------------------------------


@router.post("/items/{item_id}/apply-repair", response_model=ApplyRepairResult)
def apply_repair(
    item_id: str,
    candidate_id: str | None = None,
    store: DataStore = Depends(store_dep),
) -> ApplyRepairResult:
    item = store.get_item(item_id)
    dist = store.get_distributions(item_id)
    if item is None or dist is None:
        raise HTTPException(status_code=404, detail=f"Unknown item '{item_id}'.")

    recommendation = diagnostics.recommend_best_repair(item, dist, store.candidates)

    # Pick the requested candidate, else the engine-recommended best.
    chosen = None
    if candidate_id is not None:
        chosen = next((c for c in store.candidates if c.id == candidate_id), None)
        if chosen is None:
            raise HTTPException(
                status_code=404, detail=f"Unknown candidate '{candidate_id}'."
            )
    else:
        chosen = next(
            c for c in store.candidates if c.id == recommendation.best_candidate.candidate_id
        )

    before_sep = recommendation.current_separability
    before_band = recommendation.current_power_band
    chosen_score = next(
        s for s in recommendation.all_candidates if s.candidate_id == chosen.id
    )
    after_sep = chosen_score.overall_separability
    after_band = chosen_score.power_band

    # Build a new item from the candidate and add it to an in-memory copy of
    # the assessment (prototype: not persisted to disk).
    new_item = AssessmentItem(
        id=chosen.id,
        question=chosen.question,
        options=[ResponseOption(**opt.model_dump()) for opt in chosen.options],
        correctOption=chosen.options[0].id,
        targetStates=list(item.targetStates),
    )
    updated_items = list(store.assessment.items)
    if not any(existing.id == new_item.id for existing in updated_items):
        updated_items.append(new_item)
        store.assessment.items = updated_items
        store.add_mapping(
            MisconceptionResponseMapping(
                itemId=chosen.id, distributions=chosen.distributions
            )
        )

    return ApplyRepairResult(
        assessment_id=store.assessment.id,
        repaired_item_id=item_id,
        added_item_id=chosen.id,
        before_separability=before_sep,
        before_power_band=before_band,
        after_separability=after_sep,
        after_power_band=after_band,
        delta=round(after_sep - before_sep, 6),
        assessment=store.assessment,
        message=(
            f"Added repair item {chosen.id} ('{chosen.question}') alongside "
            f"{item_id}. Separability of the repair is {after_sep:.2f} "
            f"({after_band}) vs {before_sep:.2f} ({before_band}) for the "
            f"original item."
        ),
    )


# ---- reset --------------------------------------------------------------


@router.post("/reset")
def reset() -> dict:
    """Rebuild the in-memory store from the seeded JSON data.

    ``apply-repair`` mutates the process-wide singleton store (prototype
    shortcut), so this route rolls it back to the seeded baseline to make the
    demo idempotent across repeated walkthroughs.
    """
    store = reset_store()
    return {
        "status": "reset",
        "assessment_id": store.assessment.id,
        "item_count": len(store.assessment.items),
    }
