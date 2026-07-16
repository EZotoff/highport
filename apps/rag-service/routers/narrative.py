"""Narrative generation router for AI-powered character creation assistance."""

from fastapi import APIRouter, Header, HTTPException

from schemas.narrative import (
    EventDescriptionRequest,
    EventDescriptionResponse,
    NPCDetailsRequest,
    NPCDetailsResponse,
    SuggestConnectionsRequest,
    SuggestConnectionsResponse,
    MishapDescriptionRequest,
    MishapDescriptionResponse,
    LifepathReviewRequest,
    LifepathReviewResponse,
    CrossCharacterLinksRequest,
    CrossCharacterLinksResponse,
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
        result = await generator.generate_event_description(
            request,
            _build_scope(x_is_gm, x_character_id),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/mishap-description", response_model=MishapDescriptionResponse)
async def generate_mishap_description(request: MishapDescriptionRequest):
    """Generate a narrative description for a career mishap.

    Args:
        request: Mishap context and verbosity settings.

    Returns:
        Generated mishap description.
    """
    generator = _get_generator()
    try:
        result = await generator.generate_mishap_description(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/npc-details", response_model=NPCDetailsResponse)
async def generate_npc_details(
    request: NPCDetailsRequest,
    x_character_id: str | None = Header(None, alias="X-Character-Id"),
    x_is_gm: str = Header("false", alias="X-Is-GM"),
):
    """Generate detailed NPC information.

    Args:
        request: NPC context and verbosity settings.

    Returns:
        Generated NPC details.
    """
    generator = _get_generator()
    try:
        result = await generator.generate_npc_details(
            request,
            _build_scope(x_is_gm, x_character_id),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/suggest-connections", response_model=SuggestConnectionsResponse)
async def suggest_connections(
    request: SuggestConnectionsRequest,
    x_character_id: str | None = Header(None, alias="X-Character-Id"),
    x_is_gm: str = Header("false", alias="X-Is-GM"),
):
    """Suggest connections between entities.

    Args:
        request: List of entities and character context.

    Returns:
        Suggested connections.
    """
    generator = _get_generator()
    try:
        result = await generator.suggest_connections(
            request,
            _build_scope(x_is_gm, x_character_id),
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/lifepath-review", response_model=LifepathReviewResponse)
async def generate_lifepath_review(
    request: LifepathReviewRequest,
    x_character_id: str | None = Header(None, alias="X-Character-Id"),
    x_is_gm: str = Header("false", alias="X-Is-GM"),
) -> LifepathReviewResponse:
    """Review a complete character lifepath and return advisory proposals."""
    generator = _get_generator()
    try:
        proposals = await generator.generate_lifepath_review(
            request.character,
            request.campaign_context,
            _build_scope(x_is_gm, x_character_id),
        )
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    return LifepathReviewResponse.model_validate({"proposals": proposals[:5]})


@router.post("/cross-character-links", response_model=CrossCharacterLinksResponse)
async def suggest_cross_character_links(
    request: CrossCharacterLinksRequest,
    x_character_id: str | None = Header(None, alias="X-Character-Id"),
    x_is_gm: str = Header("false", alias="X-Is-GM"),
) -> CrossCharacterLinksResponse:
    """Propose narrative links between characters in the same campaign."""
    generator = _get_generator()
    try:
        proposals = await generator.suggest_cross_character_links(
            request.characters,
            request.shared_history,
            _build_scope(x_is_gm, x_character_id),
        )
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=503, detail=str(e))
    return CrossCharacterLinksResponse.model_validate({"proposals": proposals[:3]})
