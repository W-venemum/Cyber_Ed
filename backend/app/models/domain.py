"""Core domain models: the shapes that live in the JSON data files.

These mirror the on-disk JSON structures (assessment.json, states.json,
mappings.json, candidates.json) so they can be loaded and validated directly.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ResponseOption(BaseModel):
    """A single selectable answer option on an assessment item."""

    id: str = Field(..., description="Option identifier, e.g. 'A'.")
    text: str = Field(..., description="Human-readable option text, e.g. '3/4'.")
    state: str = Field(
        ...,
        description="Misconception state id this option is diagnostic of (e.g. 'M1').",
    )


class AssessmentItem(BaseModel):
    """A question in an assessment."""

    id: str
    question: str
    options: list[ResponseOption]
    correctOption: str = Field(..., description="Option id of the correct answer.")
    targetStates: list[str] = Field(
        ...,
        description="Misconception state ids this item is meant to distinguish between.",
    )


class Assessment(BaseModel):
    """A teacher-authored assessment made up of items."""

    id: str
    title: str
    domain: str
    items: list[AssessmentItem]


class MisconceptionState(BaseModel):
    """A latent learner state (mastery or a specific misconception)."""

    id: str
    name: str
    description: str


class MisconceptionResponseMapping(BaseModel):
    """Per-item predicted answer distributions for each target state.

    distributions[stateId][optionId] = predicted probability that a learner in
    ``stateId`` selects ``optionId`` on this item. Each state's distribution
    should sum to approximately 1.0.
    """

    itemId: str
    distributions: dict[str, dict[str, float]]


class CandidateRepairItem(BaseModel):
    """A curated replacement/repair question with its own predicted distributions."""

    id: str
    question: str
    options: list[ResponseOption]
    intendedPurpose: str
    distributions: dict[str, dict[str, float]]
