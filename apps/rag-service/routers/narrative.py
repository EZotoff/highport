"""Narrative generation router for AI-powered character creation assistance."""

from fastapi import APIRouter, HTTPException

from schemas.narrative import (
    EventDescriptionRequest,
    EventDescriptionResponse,
    NPCDetailsRequest,
    NPCDetailsResponse,
    SuggestConnectionsRequest,
    SuggestConnectionsResponse,
)
from services.narrative_generator import NarrativeGenerator

router = APIRouter(prefix="/narrative", tags=["narrative"])

# Dependency override for testing
_generator_override = None


def set_dependencies(generator=None) -> None:
    global _generator_override
    _generator_override = generator


def clear_dependencies() -> None:
    global _generator_override
    _generator_override = None


def _get_generator() -> NarrativeGenerator:
    if _generator_override is not None:
        return _generator_override
    return NarrativeGenerator()


@router.post("/event-description", response_model=EventDescriptionResponse)
async def generate_event_description(request: EventDescriptionRequest):
    """Generate a narrative description for a career event.

    Args:
        request: Event context and verbosity settings.

    Returns:
        Generated description with suggested entities.
    """
    generator = _get_generator()
    try:
        result = await generator.generate_event_description(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/npc-details", response_model=NPCDetailsResponse)
async def generate_npc_details(request: NPCDetailsRequest):
    """Generate detailed NPC information.

    Args:
        request: NPC context and verbosity settings.

    Returns:
        Generated NPC details.
    """
    generator = _get_generator()
    try:
        result = await generator.generate_npc_details(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/suggest-connections", response_model=SuggestConnectionsResponse)
async def suggest_connections(request: SuggestConnectionsRequest):
    """Suggest connections between entities.

    Args:
        request: List of entities and character context.

    Returns:
        Suggested connections.
    """
    generator = _get_generator()
    try:
        result = await generator.suggest_connections(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
