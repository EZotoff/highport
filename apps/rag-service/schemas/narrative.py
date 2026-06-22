"""Pydantic models for narrative generation endpoints."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel


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
