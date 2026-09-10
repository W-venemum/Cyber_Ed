"""Deterministic diagnostic engine API.

This module turns predicted per-state answer distributions into explainable
diagnostic outputs:

  * how well an item separates each pair of target misconception states,
  * an item's overall diagnostic power (a band: HIGH / MEDIUM / LOW),
  * the item's blind spot (the weakest-separated pair),
  * scored & ranked candidate repair items,
  * the single recommended best repair.

Overall separability weighting
-------------------------------
``overall_separability`` is the *equal-weight arithmetic mean* of the pairwise
JSD across every unordered pair of the item's target states. Equal weighting is
chosen for the prototype because we have no prior on which confusions matter
most; it is documented here and in config.json so it can be swapped later.

Everything is deterministic: no randomness, no external calls, no I/O beyond
reading the cached threshold config.
"""

from __future__ import annotations

from itertools import combinations
from typing import Mapping, Sequence

from app.engine import config as config_module
from app.engine.separability import separability_from_maps
from app.models.domain import AssessmentItem, CandidateRepairItem
from app.models.schemas import (
    BlindSpot,
    CandidateScore,
    DiagnosticAnalysis,
    PairwiseSeparation,
    RepairRecommendation,
)


def calculate_pairwise_separability(
    dist_a: Mapping[str, float],
    dist_b: Mapping[str, float],
    option_ids: Sequence[str],
) -> float:
    """Separability (JSD, base 2, in [0,1]) between two state distributions.

    The distributions are aligned onto ``option_ids`` so both are compared over
    the same option vector.
    """
    return separability_from_maps(dist_a, dist_b, option_ids)


def _option_ids(item_options: Sequence, distributions: Mapping[str, Mapping[str, float]]) -> list[str]:
    """Determine the canonical option ordering for an item.

    Prefer the item's declared option ids; fall back to the union of option ids
    seen across the distributions (sorted for determinism).
    """
    if item_options:
        return [opt.id for opt in item_options]
    seen: set[str] = set()
    for dist in distributions.values():
        seen.update(dist.keys())
    return sorted(seen)


def _pairwise_separations(
    target_states: Sequence[str],
    distributions: Mapping[str, Mapping[str, float]],
    option_ids: Sequence[str],
) -> list[PairwiseSeparation]:
    """Compute JSD for every unordered pair of target states, deterministically ordered."""
    results: list[PairwiseSeparation] = []
    for state_a, state_b in combinations(target_states, 2):
        if state_a not in distributions or state_b not in distributions:
            continue
        sep = calculate_pairwise_separability(
            distributions[state_a], distributions[state_b], option_ids
        )
        results.append(
            PairwiseSeparation(state_a=state_a, state_b=state_b, separability=sep)
        )
    return results


def _overall(pairwise: Sequence[PairwiseSeparation]) -> float:
    """Equal-weight mean of pairwise separabilities (documented weighting)."""
    if not pairwise:
        return 0.0
    return sum(p.separability for p in pairwise) / len(pairwise)


def _weakest(pairwise: Sequence[PairwiseSeparation]) -> PairwiseSeparation:
    """Return the weakest-separated pair.

    Ties are broken deterministically by (state_a, state_b) so repeated calls
    give identical results.
    """
    return min(pairwise, key=lambda p: (p.separability, p.state_a, p.state_b))


def find_blind_spots(
    item: AssessmentItem,
    distributions: Mapping[str, Mapping[str, float]],
) -> BlindSpot:
    """Return the item's blind spot: its weakest-separated target-state pair.

    The blind spot carries the two competing predicted distributions plus a
    human-readable explanation referencing the numeric separability.
    """
    option_ids = _option_ids(item.options, distributions)
    pairwise = _pairwise_separations(item.targetStates, distributions, option_ids)
    weakest = _weakest(pairwise)
    dist_a = {opt: float(distributions[weakest.state_a].get(opt, 0.0)) for opt in option_ids}
    dist_b = {opt: float(distributions[weakest.state_b].get(opt, 0.0)) for opt in option_ids}
    explanation = (
        f"Separability = {weakest.separability:.2f} because {weakest.state_a} and "
        f"{weakest.state_b} produce similar predicted response distributions on "
        f"this item, so a learner in either state tends to pick the same option."
    )
    return BlindSpot(
        state_a=weakest.state_a,
        state_b=weakest.state_b,
        separability=round(weakest.separability, 6),
        distribution_a=dist_a,
        distribution_b=dist_b,
        explanation=explanation,
    )


def calculate_item_diagnostic_power(
    item: AssessmentItem,
    distributions: Mapping[str, Mapping[str, float]],
    thresholds: config_module.Thresholds | None = None,
) -> tuple[float, str]:
    """Return (overall_separability, power_band) for an item."""
    thresholds = thresholds or config_module.load_thresholds()
    option_ids = _option_ids(item.options, distributions)
    pairwise = _pairwise_separations(item.targetStates, distributions, option_ids)
    overall = _overall(pairwise)
    return overall, thresholds.classify(overall)


def analyze_item(
    item: AssessmentItem,
    distributions: Mapping[str, Mapping[str, float]],
    thresholds: config_module.Thresholds | None = None,
) -> DiagnosticAnalysis:
    """Full diagnostic analysis of an item (deterministic and explainable)."""
    thresholds = thresholds or config_module.load_thresholds()
    option_ids = _option_ids(item.options, distributions)
    pairwise = _pairwise_separations(item.targetStates, distributions, option_ids)
    overall = _overall(pairwise)
    band = thresholds.classify(overall)
    weakest = _weakest(pairwise)
    blind_spot = find_blind_spots(item, distributions)

    explanation = (
        f"Item {item.id} has {band} diagnostic power "
        f"(overall separability {overall:.2f}, equal-weight mean of "
        f"{len(pairwise)} state-pair scores). Its biggest blind spot is "
        f"{weakest.state_a} vs {weakest.state_b} at separability "
        f"{weakest.separability:.2f}."
    )

    return DiagnosticAnalysis(
        item_id=item.id,
        question=item.question,
        target_states=list(item.targetStates),
        pairwise=pairwise,
        overall_separability=round(overall, 6),
        power_band=band,
        weakest_pair=weakest,
        blind_spot=blind_spot,
        explanation=explanation,
    )


def score_candidate_repairs(
    current_item: AssessmentItem,
    current_distributions: Mapping[str, Mapping[str, float]],
    candidates: Sequence[CandidateRepairItem],
    target_states: Sequence[str],
    thresholds: config_module.Thresholds | None = None,
) -> list[CandidateScore]:
    """Score and rank candidate repairs against the current item's blind spot.

    For each candidate we compute:
      * overall_separability across ``target_states`` (equal-weight JSD mean),
      * target_pair_separability: how well the candidate separates the current
        item's weakest (blind-spot) pair specifically,
      * improvement = candidate.overall_separability - current.overall_separability.

    Candidates are ranked by (overall_separability, target_pair_separability)
    descending, with deterministic tie-breaking on candidate id. The top-ranked
    candidate is flagged ``is_best_separator``.
    """
    thresholds = thresholds or config_module.load_thresholds()

    current_overall, _ = calculate_item_diagnostic_power(
        current_item, current_distributions, thresholds
    )
    blind_spot = find_blind_spots(current_item, current_distributions)
    pair_a, pair_b = blind_spot.state_a, blind_spot.state_b

    scored: list[CandidateScore] = []
    for cand in candidates:
        option_ids = [opt.id for opt in cand.options] or _option_ids([], cand.distributions)
        pairwise = _pairwise_separations(target_states, cand.distributions, option_ids)
        overall = _overall(pairwise)
        band = thresholds.classify(overall)

        if pair_a in cand.distributions and pair_b in cand.distributions:
            target_pair_sep = calculate_pairwise_separability(
                cand.distributions[pair_a], cand.distributions[pair_b], option_ids
            )
        else:
            target_pair_sep = 0.0

        scored.append(
            CandidateScore(
                candidate_id=cand.id,
                question=cand.question,
                intended_purpose=cand.intendedPurpose,
                overall_separability=round(overall, 6),
                power_band=band,
                target_pair_separability=round(target_pair_sep, 6),
                improvement=round(overall - current_overall, 6),
                rank=0,
                is_best_separator=False,
            )
        )

    # Deterministic ranking: strongest overall separator first, then best on
    # the specific blind-spot pair, then candidate id for a stable tie-break.
    scored.sort(
        key=lambda c: (-c.overall_separability, -c.target_pair_separability, c.candidate_id)
    )
    for index, candidate in enumerate(scored, start=1):
        candidate.rank = index
        candidate.is_best_separator = index == 1
    return scored


def recommend_best_repair(
    current_item: AssessmentItem,
    current_distributions: Mapping[str, Mapping[str, float]],
    candidates: Sequence[CandidateRepairItem],
    target_states: Sequence[str] | None = None,
    thresholds: config_module.Thresholds | None = None,
) -> RepairRecommendation:
    """Recommend the highest-scoring candidate repair with a rationale."""
    thresholds = thresholds or config_module.load_thresholds()
    target_states = list(target_states or current_item.targetStates)

    current_overall, current_band = calculate_item_diagnostic_power(
        current_item, current_distributions, thresholds
    )
    scored = score_candidate_repairs(
        current_item, current_distributions, candidates, target_states, thresholds
    )
    if not scored:
        raise ValueError("No candidate repairs available to recommend.")

    best = scored[0]
    blind_spot = find_blind_spots(current_item, current_distributions)
    rationale = (
        f"'{best.question}' (candidate {best.candidate_id}) is the strongest "
        f"repair: it raises overall separability from {current_overall:.2f} "
        f"({current_band}) to {best.overall_separability:.2f} ({best.power_band}), "
        f"an improvement of {best.improvement:+.2f}, and separates the "
        f"{blind_spot.state_a} vs {blind_spot.state_b} blind spot at "
        f"{best.target_pair_separability:.2f} (was {blind_spot.separability:.2f})."
    )

    return RepairRecommendation(
        item_id=current_item.id,
        current_separability=round(current_overall, 6),
        current_power_band=current_band,
        best_candidate=best,
        all_candidates=scored,
        rationale=rationale,
    )
