"""Threshold configuration loader.

Thresholds are heuristic/demo values that live in ``app/data/config.json`` so
they are inspectable and tunable, and are NOT magic numbers buried in engine
code. This module is the single place the engine reads them from.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_CONFIG_PATH = _DATA_DIR / "config.json"

BAND_HIGH = "HIGH"
BAND_MEDIUM = "MEDIUM"
BAND_LOW = "LOW"


@dataclass(frozen=True)
class Thresholds:
    """Separability band cut-offs (heuristic/demo)."""

    high_threshold: float
    medium_threshold: float
    label: str

    def classify(self, separability: float) -> str:
        """Map an overall separability score to a power band."""
        if separability >= self.high_threshold:
            return BAND_HIGH
        if separability >= self.medium_threshold:
            return BAND_MEDIUM
        return BAND_LOW


@lru_cache(maxsize=1)
def load_thresholds(config_path: str | None = None) -> Thresholds:
    """Load thresholds from config.json (cached)."""
    path = Path(config_path) if config_path else _CONFIG_PATH
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    return Thresholds(
        high_threshold=float(data["high_threshold"]),
        medium_threshold=float(data["medium_threshold"]),
        label=str(data.get("_label", "heuristic/demo thresholds")),
    )
