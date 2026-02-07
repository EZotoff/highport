"""Portrait generation router for AI-powered character visualization."""

from fastapi import APIRouter, HTTPException

from schemas.portrait import (
    ExtractTagsRequest,
    ExtractTagsResponse,
    GeneratePortraitRequest,
    GeneratePortraitResponse,
)
from services.portrait_generator import PortraitGenerator

router = APIRouter(prefix="/ai/portraits", tags=["portraits"])

# Dependency override for testing
_generator_override = None


def set_dependencies(generator=None) -> None:
    global _generator_override
    _generator_override = generator


def clear_dependencies() -> None:
    global _generator_override
    _generator_override = None


def _get_generator() -> PortraitGenerator:
    if _generator_override is not None:
        return _generator_override
    return PortraitGenerator()


@router.post("/image", response_model=GeneratePortraitResponse)
async def generate_portrait_image(request: GeneratePortraitRequest):
    """Generate a character portrait image.

    Args:
        request: Character tags and optional appearance text.

    Returns:
        Generated portrait image with metadata.
    """
    generator = _get_generator()
    try:
        result = await generator.generate_portrait_image(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


@router.post("/tags", response_model=ExtractTagsResponse)
async def extract_portrait_tags(request: ExtractTagsRequest):
    """Extract structured tags for a portrait.

    Args:
        request: Appearance text and character context.

    Returns:
        Structured portrait tags with confidence values.
    """
    generator = _get_generator()
    try:
        result = await generator.extract_portrait_tags(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
