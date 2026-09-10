"""Response schemas produced by the diagnostic engine and API layer.

These are the computed, explainable outputs. Every numeric value here is
calculated by the engine (never hardcoded).
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.domain import Assessment


class PairwiseSeparation(BaseModel):
    """Separability between one pair of misconception states on an item."""

    state_a: str
    state_b: str
    separability: float = Field(
        ..., description="Jensen-Shannon divergence (log base 2), bounded in [0,1]."
    )


class BlindSpot(BaseModel):
    """The weakest-separated state pair(s) for an item, with an explanation."""

    state_a: str
    state_b: str
    separability: float
    distribution_a: dict[str, float]
    distribution_b: dict[str, float]
    explanation: str


class DiagnosticAnalysis(BaseModel):
    """Full diagnostic analysis of a single assessment item."""

    item_id: str
    question: str
    target_states: list[str]
    pairwise: list[PairwiseSeparation]
    overall_separability: float
    power_band: str = Field(..., description="HIGH, MEDIUM, or LOW.")
    weakest_pair: PairwiseSeparation
    blind_spot: BlindSpot
    explanation: str


class ObservedDistribution(BaseModel):
    """Illustrative observed answer counts for an item (demo data)."""

    item_id: str
    total_responses: int
    counts: dict[str, int]
    proportions: dict[str, float]
    label: str = "Illustrative demo responses"


class CandidateScore(BaseModel):
    """A scored, ranked candidate repair item."""

    candidate_id: str
    question: str
    intended_purpose: str
    overall_separability: float
    power_band: str
    target_pair_separability: float = Field(
        ...,
        description="Separability of the current item's weakest (blind-spot) pair on this candidate.",
    )
    improvement: float = Field(
        ...,
        description="candidate.overall_separability - current_item.overall_separability.",
    )
    rank: int
    is_best_separator: bool


class RepairRecommendation(BaseModel):
    """The engine's recommended best repair for an item."""

    item_id: str
    current_separability: float
    current_power_band: str
    best_candidate: CandidateScore
    all_candidates: list[CandidateScore]
    rationale: str


class ItemAuditSummary(BaseModel):
    """Compact per-item diagnostic summary used by dashboard cards."""

    item_id: str
    question: str
    overall_separability: float
    power_band: str
    weakest_pair: PairwiseSeparation


class AssessmentAudit(BaseModel):
    """Audit summary for an entire assessment."""

    assessment_id: str
    title: str
    domain: str
    item_count: int
    items: list[ItemAuditSummary]
    band_counts: dict[str, int]
    blind_spot_count: int


class AssessmentSummary(BaseModel):
    """Assessment list-card summary."""

    id: str
    title: str
    domain: str
    item_count: int
    audit_status: str
    blind_spot_count: int
    last_analyzed: str


class ApplyRepairResult(BaseModel):
    """Result of applying a repair candidate to an assessment."""

    assessment_id: str
    repaired_item_id: str
    added_item_id: str
    before_separability: float
    before_power_band: str
    after_separability: float
    after_power_band: str
    delta: float
    assessment: Assessment
    message: str


# Resolve the forward reference to Assessment now that it is imported.
ApplyRepairResult.model_rebuild()
