"""Portrait generation service for AI-powered character visualization."""

import json
import re
from typing import Optional

from providers.gemini import GeminiProvider
from schemas.portrait import (
    ExtractTagsRequest,
    ExtractTagsResponse,
    GeneratePortraitRequest,
    GeneratePortraitResponse,
    PortraitStory,
    PortraitTags,
)


class PortraitGenerator:
    """Service for generating character portraits and tags using AI."""

    def __init__(self, llm: Optional[GeminiProvider] = None):
        """Initialize the portrait generator.

        Args:
            llm: Optional LLM provider. If not provided, creates a new GeminiProvider.
        """
        self._llm = llm

    def _get_llm(self) -> GeminiProvider:
        """Get or create the LLM provider."""
        if self._llm is None:
            self._llm = GeminiProvider()
        return self._llm

    async def generate_portrait_image(
        self, request: GeneratePortraitRequest
    ) -> GeneratePortraitResponse:
        """Generate a character portrait image.

        Args:
            request: The portrait image request with tags and context.

        Returns:
            GeneratePortraitResponse with image data and metadata.
        """
        llm = self._get_llm()
        prompt = build_prompt(
            request.tags, request.appearance_text, request.prompt_delta
        )

        if request.reference_image_base64:
            image_data, mime_type, model_id = await llm.generate_image_from_reference(
                prompt=prompt,
                reference_image_base64=request.reference_image_base64,
                reference_image_mime_type=request.reference_image_mime_type
                or "image/png",
                aspect_ratio=request.aspect_ratio or "1:1",
            )
        else:
            image_data, mime_type, model_id = await llm.generate_image(
                prompt=prompt,
                aspect_ratio=request.aspect_ratio or "1:1",
            )

        return GeneratePortraitResponse(
            image_base64=image_data,
            mime_type=mime_type,
            prompt_used=prompt,
            model_id=model_id,
        )

    async def extract_portrait_tags(
        self, request: ExtractTagsRequest
    ) -> ExtractTagsResponse:
        """Generate portrait tags from description and context.

        Args:
            request: The tag extraction request with appearance text.

        Returns:
            ExtractTagsResponse with structured tags and confidence.
        """
        llm = self._get_llm()

        characteristics_text = ""
        if request.characteristics:
            characteristics_text = ", ".join(
                f"{key}:{value}" for key, value in request.characteristics.items()
            )
        else:
            characteristics_text = "None provided."

        prompt = f"""You are a character visual designer for the Traveller tabletop RPG. Extract structured portrait tags.

## Context
- Entity Type: {request.entity_type.value}
- Career: {request.career or "unknown"}
- Characteristics: {characteristics_text}
- Appearance Text: "{request.appearance_text}"

## Instructions
Return tags that match the following schema. Only use allowed enum values, or omit the field.

## Response Format
Respond with a JSON object:
{{
  "tags": {{
    "demographics": {{
      "gender": "female|male|nonbinary|ambiguous",
      "age_range": "child|teen|young_adult|adult|middle_aged|elder",
      "skin_tone": "very_fair|fair|medium|olive|brown|dark",
      "eye_color": "brown|hazel|green|blue|gray|amber",
      "hair_color": "black|brown|blonde|red|gray|white|dyed",
      "hair_style": "buzzcut|short|medium|long|bald|ponytail|braids|afro|wavy|curly"
    }},
    "physical": {{
      "build": "slim|average|athletic|stocky|heavy",
      "height": "short|average|tall",
      "distinguishing_features": ["scar","tattoo","cybernetic_implant","piercing","missing_eye","burn_marks","freckles","beard","mustache"]
    }},
    "career": {{
      "career_type": "navy|marines|scout|merchant|army|agent|noble|drifter|scholar|rogue|citizen|entertainer|other",
      "rank_level": "low|mid|high",
      "career_style": "uniformed|civilian|corporate|street|formal"
    }},
    "traits": {{
      "demeanor": "calm|stern|friendly|aloof|nervous|aggressive",
      "vibe": "trustworthy|menacing|mysterious|eccentric|professional"
    }},
    "background": {{
      "homeworld_type": "high_tech|industrial|frontier|agricultural|underclass|rich_core",
      "social_class": "low|middle|upper|noble"
    }},
    "story": {{
      "entity_type": "traveller|npc",
      "relationship_type": "ally|enemy|neutral|patron|contact|family|rival",
      "importance_level": "extra|supporting|key"
    }},
    "rendering": {{
      "style": "realistic|painterly|cinematic|comic",
      "framing": "headshot|bust|full_body",
      "lighting": "neutral|dramatic|low_key|high_key"
    }},
    "freeform": ["optional","keywords"]
  }},
  "confidence": {{
    "demographics": 0.8,
    "physical": 0.7,
    "career": 0.6,
    "traits": 0.6,
    "background": 0.5,
    "story": 1.0,
    "rendering": 0.4
  }}
}}"""

        try:
            response_text = await llm.generate(prompt)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                tags_data = data.get("tags", {})
                tags = PortraitTags.parse_obj(tags_data)
                return ExtractTagsResponse(
                    tags=tags,
                    confidence=data.get("confidence", {}),
                )
        except json.JSONDecodeError:
            pass
        except Exception as e:
            raise RuntimeError(f"Portrait tag extraction failed: {e}")

        fallback_tags = PortraitTags(
            story=PortraitStory(entity_type=request.entity_type),
        )
        return ExtractTagsResponse(tags=fallback_tags, confidence={})


def build_prompt(
    tags: PortraitTags,
    appearance_text: Optional[str],
    prompt_delta: Optional[str],
) -> str:
    """Build a portrait prompt from tags and optional appearance text."""
    tag_data = tags.dict(exclude_none=True)
    demographics = tag_data.get("demographics", {})
    physical = tag_data.get("physical", {})
    career = tag_data.get("career", {})
    traits = tag_data.get("traits", {})
    background = tag_data.get("background", {})
    story = tag_data.get("story", {})
    rendering = tag_data.get("rendering", {})

    parts = [
        "Create a Traveller RPG character portrait.",
        f"Entity: {story.get('entity_type', 'npc')}",
    ]

    if demographics:
        parts.append(
            "Demographics: "
            + ", ".join(
                value
                for value in [
                    demographics.get("gender"),
                    demographics.get("age_range"),
                    demographics.get("skin_tone"),
                    demographics.get("eye_color"),
                    demographics.get("hair_color"),
                    demographics.get("hair_style"),
                ]
                if value
            )
        )

    if physical:
        physical_parts = [physical.get("build"), physical.get("height")]
        if physical.get("distinguishing_features"):
            physical_parts.append(
                ", ".join(str(f) for f in physical.get("distinguishing_features", []))
            )
        parts.append("Physical: " + ", ".join(p for p in physical_parts if p))

    if career:
        parts.append(
            "Career: "
            + ", ".join(
                value
                for value in [
                    career.get("career_type"),
                    career.get("rank_level"),
                    career.get("career_style"),
                ]
                if value
            )
        )

    if traits:
        parts.append(
            "Traits: "
            + ", ".join(
                value for value in [traits.get("demeanor"), traits.get("vibe")] if value
            )
        )

    if background:
        parts.append(
            "Background: "
            + ", ".join(
                value
                for value in [
                    background.get("homeworld_type"),
                    background.get("social_class"),
                ]
                if value
            )
        )

    if rendering:
        parts.append(
            "Rendering: "
            + ", ".join(
                value
                for value in [
                    rendering.get("style"),
                    rendering.get("framing"),
                    rendering.get("lighting"),
                ]
                if value
            )
        )

    if appearance_text:
        parts.append(f"Appearance: {appearance_text}")

    if prompt_delta:
        parts.append(f"Additional instruction: {prompt_delta}")

    parts.append("Background: subtle sci-fi neutral, no text, no logos, no watermark.")
    parts.append("Do not resemble real people or celebrities.")

    return "\n".join(part for part in parts if part)
