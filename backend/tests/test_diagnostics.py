"""Unit tests for the diagnostic engine against the seeded demo data."""

from __future__ import annotations

from app.data_store import reset_store
from app.engine import diagnostics
from app.engine.config import load_thresholds
from app.models.domain import AssessmentItem, ResponseOption


def _make_item(item_id: str, target_states):
    options = [
        ResponseOption(id="A", text="a", state="M1"),
        ResponseOption(id="B", text="b", state="M2"),
        ResponseOption(id="C", text="c", state="M4"),
        ResponseOption(id="D", text="d", state="M3"),
    ]
    return AssessmentItem(
        id=item_id,
        question="q?",
        options=options,
        correctOption="A",
        targetStates=target_states,
    )


def test_strong_item_scores_higher_than_confounded_item():
    """A strongly separating item scores higher than a confounded one."""
    states = ["M1", "M2", "M3", "M4"]
    strong = _make_item("STRONG", states)
    confounded = _make_item("CONFOUNDED", states)

    strong_dist = {
        "M1": {"A": 0.9, "B": 0.04, "C": 0.03, "D": 0.03},
        "M2": {"A": 0.03, "B": 0.9, "C": 0.04, "D": 0.03},
        "M3": {"A": 0.03, "B": 0.03, "C": 0.04, "D": 0.9},
        "M4": {"A": 0.03, "B": 0.03, "C": 0.9, "D": 0.04},
    }
    # Every state predicts essentially the same answer -> confounded.
    confounded_dist = {
        "M1": {"A": 0.7, "B": 0.1, "C": 0.1, "D": 0.1},
        "M2": {"A": 0.68, "B": 0.12, "C": 0.1, "D": 0.1},
        "M3": {"A": 0.66, "B": 0.12, "C": 0.12, "D": 0.1},
        "M4": {"A": 0.69, "B": 0.11, "C": 0.1, "D": 0.1},
    }
    strong_sep, strong_band = diagnostics.calculate_item_diagnostic_power(strong, strong_dist)
    conf_sep, conf_band = diagnostics.calculate_item_diagnostic_power(confounded, confounded_dist)

    assert strong_sep > conf_sep
    assert strong_band == "HIGH"
    assert conf_band == "LOW"


def test_q3_is_low_with_m2_m4_blind_spot():
    """Q3 has LOW power and its weakest pair is M2 vs M4."""
    store = reset_store()
    q3 = store.get_item("Q3")
    dist = store.get_distributions("Q3")
    analysis = diagnostics.analyze_item(q3, dist)

    assert analysis.overall_separability < 0.40
    assert analysis.power_band == "LOW"
    pair = {analysis.weakest_pair.state_a, analysis.weakest_pair.state_b}
    assert pair == {"M2", "M4"}
    # Explanation references the numeric separability.
    assert f"{analysis.blind_spot.separability:.2f}" in analysis.blind_spot.explanation
    assert "M2" in analysis.blind_spot.explanation and "M4" in analysis.blind_spot.explanation


def test_high_and_medium_items_present():
    """The assessment includes at least one HIGH and one MEDIUM item."""
    store = reset_store()
    bands = set()
    for item in store.assessment.items:
        dist = store.get_distributions(item.id)
        _, band = diagnostics.calculate_item_diagnostic_power(item, dist)
        bands.add(band)
    assert "HIGH" in bands
    assert "MEDIUM" in bands
    assert "LOW" in bands


def test_candidate_ranking_selects_q8():
    """Candidate ranking selects Q8 as the strongest separator for M2/M4."""
    store = reset_store()
    q3 = store.get_item("Q3")
    dist = store.get_distributions("Q3")
    scored = diagnostics.score_candidate_repairs(
        q3, dist, store.candidates, q3.targetStates
    )
    assert scored[0].candidate_id == "Q8"
    assert scored[0].is_best_separator is True
    assert scored[0].rank == 1
    assert scored[0].power_band == "HIGH"
    # Ranks are contiguous and unique.
    assert [c.rank for c in scored] == list(range(1, len(scored) + 1))


def test_repair_improvement_delta_computed_correctly():
    """improvement == candidate.overall_separability - current.overall_separability."""
    store = reset_store()
    q3 = store.get_item("Q3")
    dist = store.get_distributions("Q3")
    current_sep, _ = diagnostics.calculate_item_diagnostic_power(q3, dist)
    scored = diagnostics.score_candidate_repairs(
        q3, dist, store.candidates, q3.targetStates
    )
    for cand in scored:
        expected = cand.overall_separability - current_sep
        assert abs(cand.improvement - expected) < 1e-5
    # Best repair improves things.
    assert scored[0].improvement > 0


def test_recommend_best_repair_rationale_and_delta():
    store = reset_store()
    q3 = store.get_item("Q3")
    dist = store.get_distributions("Q3")
    rec = diagnostics.recommend_best_repair(q3, dist, store.candidates)
    assert rec.best_candidate.candidate_id == "Q8"
    assert rec.current_power_band == "LOW"
    assert rec.best_candidate.overall_separability > rec.current_separability
    assert "Q8" in rec.rationale


def test_deterministic_repeated_calls_identical():
    """Deterministic engine: same input -> identical output across calls."""
    store = reset_store()
    q3 = store.get_item("Q3")
    dist = store.get_distributions("Q3")
    a = diagnostics.analyze_item(q3, dist)
    b = diagnostics.analyze_item(q3, dist)
    assert a.model_dump() == b.model_dump()

    r1 = diagnostics.score_candidate_repairs(q3, dist, store.candidates, q3.targetStates)
    r2 = diagnostics.score_candidate_repairs(q3, dist, store.candidates, q3.targetStates)
    assert [c.model_dump() for c in r1] == [c.model_dump() for c in r2]


def test_thresholds_loaded_from_config():
    t = load_thresholds()
    assert t.high_threshold == 0.70
    assert t.medium_threshold == 0.40
    assert "heuristic" in t.label.lower() or "demo" in t.label.lower()
