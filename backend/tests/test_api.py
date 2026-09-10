"""FastAPI TestClient integration tests."""

from __future__ import annotations


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_list_assessments(client):
    resp = client.get("/api/assessments")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "fractions-demo"
    assert data[0]["blind_spot_count"] >= 1


def test_states_endpoint(client):
    resp = client.get("/api/states")
    assert resp.status_code == 200
    ids = {s["id"] for s in resp.json()}
    assert {"M1", "M2", "M3", "M4"} <= ids


def test_item_audit_q3(client):
    resp = client.get("/api/items/Q3/audit")
    assert resp.status_code == 200
    analysis = resp.json()["analysis"]
    assert analysis["power_band"] == "LOW"
    assert analysis["overall_separability"] < 0.40
    pair = {analysis["weakest_pair"]["state_a"], analysis["weakest_pair"]["state_b"]}
    assert pair == {"M2", "M4"}
    observed = resp.json()["observed"]
    assert observed["label"] == "Illustrative demo responses"


def test_item_candidates_q3_best_is_q8(client):
    resp = client.get("/api/items/Q3/candidates")
    assert resp.status_code == 200
    data = resp.json()
    assert data["best_candidate"]["candidate_id"] == "Q8"
    assert data["best_candidate"]["is_best_separator"] is True
    assert data["best_candidate"]["improvement"] > 0
    assert data["best_candidate"]["power_band"] == "HIGH"


def test_apply_repair_q3_before_after(client):
    resp = client.post("/api/items/Q3/apply-repair")
    assert resp.status_code == 200
    data = resp.json()
    assert data["repaired_item_id"] == "Q3"
    assert data["added_item_id"] == "Q8"
    assert data["after_separability"] > data["before_separability"]
    assert data["delta"] > 0
    # The repair item was added to the assessment state.
    item_ids = {i["id"] for i in data["assessment"]["items"]}
    assert "Q8" in item_ids


def test_unknown_item_404(client):
    assert client.get("/api/items/NOPE/audit").status_code == 404
    assert client.get("/api/items/NOPE/candidates").status_code == 404
    assert client.get("/api/items/NOPE/mappings").status_code == 404


def test_unknown_assessment_404(client):
    assert client.get("/api/assessments/nope").status_code == 404
    assert client.get("/api/assessments/nope/audit").status_code == 404


def test_mappings_endpoint(client):
    resp = client.get("/api/items/Q3/mappings")
    assert resp.status_code == 200
    assert resp.json()["itemId"] == "Q3"
    assert set(resp.json()["distributions"].keys()) == {"M1", "M2", "M3", "M4"}
