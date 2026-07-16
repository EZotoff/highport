"""Pydantic models for narrative generation endpoints."""

from enum import Enum
from typing import Any, Literal, Optional
from pydantic import BaseModel, JsonValue


class VerbosityLevel(str, Enum):
    """Verbosity levels for AI generation."""

    BRIEF = "brief"
    INSPIRATION = "inspiration"
    FULL = "full"


class CharacterContext(BaseModel):
    """Context about the character for narrative generation."""

    name: str
    characteristics: dict[str, int]
    prior_events: Optional[list[str]] = None


class EventDescriptionRequest(BaseModel):
    """Request for generating an event description."""

    event_text: str
    career: str
    assignment: str
    term: int
    character_context: CharacterContext
    verbosity: VerbosityLevel = VerbosityLevel.INSPIRATION
    guidance: Optional[str] = None  # Player guidance for regeneration/refinement


class SuggestedEntity(BaseModel):
    """A suggested entity to spawn from an event."""

    type: str  # npc, location, item, secret
    relationship: Optional[str] = None
    suggested_name: Optional[str] = None
    suggested_motivation: Optional[str] = None


class EventDescriptionResponse(BaseModel):
    """Response containing generated event description."""

    description: str
    suggested_entities: list[SuggestedEntity] = []
    mode: Optional[VerbosityLevel] = None  # Which verbosity mode produced this
    guidance_used: Optional[str] = None  # Echo back guidance if provided in request


class NPCContext(BaseModel):
    """Context for NPC generation."""

    event_text: str
    career: str
    character_name: str


class NPCDetailsRequest(BaseModel):
    """Request for generating NPC details."""

    npc_type: str  # ally, contact, rival, enemy
    context: NPCContext
    existing_fields: Optional[dict[str, str]] = None
    verbosity: VerbosityLevel = VerbosityLevel.INSPIRATION
    guidance: Optional[str] = None


class NPCDetailsResponse(BaseModel):
    """Response containing generated NPC details."""

    name: str
    personality: Optional[str] = None
    motivation: Optional[str] = None
    appearance: Optional[str] = None
    quirks: Optional[list[str]] = None
    mode: Optional[VerbosityLevel] = None
    guidance_used: Optional[str] = None


class EntityForConnection(BaseModel):
    """An entity to consider for connection suggestions."""

    id: str
    name: str
    type: str
    career: Optional[str] = None


class CharacterForConnection(BaseModel):
    """Character info for connection suggestions."""

    name: str
    career_history: list[str]


class SuggestConnectionsRequest(BaseModel):
    """Request for suggesting connections between entities."""

    entities: list[EntityForConnection]
    character: CharacterForConnection


class ConnectionSuggestion(BaseModel):
    """A suggested connection between entities."""

    source: str
    target: str
    relationship: str
    description: str


class SuggestConnectionsResponse(BaseModel):
    """Response containing connection suggestions."""

    suggestions: list[ConnectionSuggestion]


class MishapDescriptionRequest(BaseModel):
    """Request for generating a mishap description."""

    mishap_text: str
    career: str
    term: int
    character_context: CharacterContext
    verbosity: VerbosityLevel = VerbosityLevel.INSPIRATION
    guidance: Optional[str] = None


class MishapDescriptionResponse(BaseModel):
    """Response containing generated mishap description."""

    description: str
    mode: Optional[VerbosityLevel] = None
    guidance_used: Optional[str] = None

class CharacterSummary(BaseModel):
    """A summarized view of a character for narrative review and cross-character linking."""

    id: str
    name: str
    career: str | None = None
    terms: list[dict[str, Any]] = []
    skills: dict[str, int] = {}
    events: list[dict[str, Any]] = []
    mishaps: list[dict[str, Any]] = []
    npcs: list[dict[str, Any]] = []
    background: str | None = None
    age: int | None = None


class LifepathReviewRequest(BaseModel):
    """Request for reviewing a complete character lifepath."""

    character: CharacterSummary
    campaign_context: list[str] | None = None


class LifepathReviewProposal(BaseModel):
    """An advisory proposal for improving a character lifepath."""

    type: Literal["coherence-edit", "npc-connection", "plot-hook"]
    title: str
    description: str
    target_term: int
    proposed_edit: str | None = None


class LifepathReviewResponse(BaseModel):
    """Response containing advisory lifepath proposals."""

    proposals: list[LifepathReviewProposal]


class CrossCharacterLinksRequest(BaseModel):
    """Request for cross-character narrative link proposals."""

    characters: list[CharacterSummary]
    shared_history: list[dict[str, JsonValue]] | None = None


class CrossCharacterLink(BaseModel):
    """A proposed narrative link between two characters."""

    source_char_id: str
    target_char_id: str
    relationship: str
    description: str
    source_entity_id: str | None = None
    target_entity_id: str | None = None


class CrossCharacterLinksResponse(BaseModel):
    """Response containing cross-character link proposals."""

    proposals: list[CrossCharacterLink]
