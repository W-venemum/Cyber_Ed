"""Data-access layer: load JSON demo data into typed models.

All diagnostic data is JSON-file driven (no database). This module loads the
files from ``app/data/`` once and exposes a small in-memory ``DataStore`` that
the API depends on. ``apply-repair`` mutates only the in-memory assessment copy
for the prototype; nothing is persisted to disk.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.models.domain import (
    Assessment,
    CandidateRepairItem,
    MisconceptionResponseMapping,
    MisconceptionState,
)

_DATA_DIR = Path(__file__).resolve().parent / "data"


def _load_json(name: str) -> dict:
    with (_DATA_DIR / name).open("r", encoding="utf-8") as fh:
        return json.load(fh)


class DataStore:
    """In-memory store of the seeded demo data."""

    def __init__(self) -> None:
        assessment_raw = _load_json("assessment.json")
        states_raw = _load_json("states.json")
        mappings_raw = _load_json("mappings.json")
        candidates_raw = _load_json("candidates.json")
        responses_raw = _load_json("responses.json")

        self.assessment: Assessment = Assessment.model_validate(assessment_raw)
        self.states: list[MisconceptionState] = [
            MisconceptionState.model_validate(s) for s in states_raw["states"]
        ]
        self.mappings: list[MisconceptionResponseMapping] = [
            MisconceptionResponseMapping.model_validate(m)
            for m in mappings_raw["mappings"]
        ]
        self.candidates: list[CandidateRepairItem] = [
            CandidateRepairItem.model_validate(c) for c in candidates_raw["candidates"]
        ]
        self.responses_label: str = responses_raw.get(
            "label", "Illustrative demo responses"
        )
        self._responses = {r["itemId"]: r for r in responses_raw["responses"]}

        self._mapping_by_item = {m.itemId: m for m in self.mappings}
        self._state_by_id = {s.id: s for s in self.states}

    # ---- accessors -------------------------------------------------------

    def get_assessment(self, assessment_id: str) -> Assessment | None:
        return self.assessment if assessment_id == self.assessment.id else None

    def get_item(self, item_id: str):
        for item in self.assessment.items:
            if item.id == item_id:
                return item
        return None

    def get_distributions(self, item_id: str) -> dict[str, dict[str, float]] | None:
        mapping = self._mapping_by_item.get(item_id)
        return mapping.distributions if mapping else None

    def get_mapping(self, item_id: str) -> MisconceptionResponseMapping | None:
        return self._mapping_by_item.get(item_id)

    def get_state(self, state_id: str) -> MisconceptionState | None:
        return self._state_by_id.get(state_id)

    def get_responses(self, item_id: str) -> dict | None:
        return self._responses.get(item_id)

    def add_mapping(self, mapping: MisconceptionResponseMapping) -> None:
        self.mappings.append(mapping)
        self._mapping_by_item[mapping.itemId] = mapping


# Module-level singleton used by the API. Reloadable for tests.
_store: DataStore | None = None


def get_store() -> DataStore:
    global _store
    if _store is None:
        _store = DataStore()
    return _store


def reset_store() -> DataStore:
    """Rebuild the store from disk (used to reset in-memory repairs in tests)."""
    global _store
    _store = DataStore()
    return _store
