"""Narrative generation service for AI-powered character generation assistance."""

import json
import logging
import re

from providers.llm import get_llm_provider
from providers.llm.base import LLMProvider
from schemas.narrative import (
    VerbosityLevel,
    EventDescriptionRequest,
    EventDescriptionResponse,
    SuggestedEntity,
    NPCDetailsRequest,
    NPCDetailsResponse,
    SuggestConnectionsRequest,
    SuggestConnectionsResponse,
    ConnectionSuggestion,
)

logger = logging.getLogger(__name__)

# Structurally different system prompts per verbosity mode.
# BRIEF: atmospheric color, no NPCs, no action prescription.
# INSPIRATION: numbered list of hooks the player may pick from.
# FULL: drafted scene with named NPCs and relationship implications.
EVENT_SYSTEM_PROMPTS = {
    VerbosityLevel.BRIEF: (
        "Write exactly 1-2 sentences of atmospheric color for this event. "
        "Do not introduce named NPCs. Do not prescribe specific actions. "
        "The dice own the facts; you own the texture."
    ),
    VerbosityLevel.INSPIRATION: (
        "Write 3-5 concrete adventure hooks or angles inspired by this event. "
        "Each hook should be 1 sentence. Format as a numbered list. "
        "These are optional flavor that the player may pick from or ignore."
    ),
    VerbosityLevel.FULL: (
        "Write a rich narrative scene (2-4 paragraphs) for this event. "
        "You may introduce named NPCs, sensory details, and implied relationships. "
        "This is a drafted scene the player may accept, edit, or reject."
    ),
}

NPC_SYSTEM_PROMPTS = {
    VerbosityLevel.BRIEF: (
        "Provide exactly the NPC's full name. No extra details."
    ),
    VerbosityLevel.INSPIRATION: (
        "Provide the NPC's name, 2-3 personality traits, and their core motivation "
        "regarding the player character. Keep each field to 1-2 sentences."
    ),
    VerbosityLevel.FULL: (
        "Provide a full NPC write-up: name, personality (2-3 sentences), "
        "motivation (2-3 sentences about what drives them), physical appearance "
        "(1-2 sentences), and 2-3 quirks or habits."
    ),
}


class NarrativeGenerator:
    """Service for generating narrative content using AI."""

    def __init__(self, llm: LLMProvider | None = None):
        self._llm: LLMProvider | None = llm

    def _get_llm(self) -> LLMProvider:
        if self._llm is None:
            self._llm = get_llm_provider()
        return self._llm

    @staticmethod
    def _build_guidance_suffix(guidance: str | None) -> str:
        """Return a guidance appendix for the system prompt, or empty string."""
        if guidance and guidance.strip():
            return (
                "\n\nPlayer direction: " + guidance.strip() + "\n"
                "Incorporate this guidance into the narrative while "
                "respecting the event's mechanical outcome."
            )
        return ""

    async def generate_event_description(
        self, request: EventDescriptionRequest
    ) -> EventDescriptionResponse:
        llm = self._get_llm()
        mode = request.verbosity
        guidance_suffix = self._build_guidance_suffix(request.guidance)

        prior_events_text = (
            "\n".join(f"- {e}" for e in request.character_context.prior_events[-3:])
            if request.character_context.prior_events
            else "No prior events recorded."
        )

        system_instruction = EVENT_SYSTEM_PROMPTS[mode] + guidance_suffix

        # Different response format per mode
        if mode == VerbosityLevel.BRIEF:
            format_block = (
                'Respond with a JSON object: {"description": "Your 1-2 sentence gloss here"}'
            )
            expect_entities = False
        elif mode == VerbosityLevel.INSPIRATION:
            format_block = (
                'Respond with a JSON object: '
                '{"description": "Numbered list of hooks (one per line)", '
                '"suggested_entities": []}'
            )
            expect_entities = False
        else:  # FULL
            format_block = (
                'Respond with a JSON object:\n'
                '{\n'
                '  "description": "Your narrative scene (2-4 paragraphs)...",\n'
                '  "suggested_entities": [\n'
                '    {\n'
                '      "type": "npc",\n'
                '      "relationship": "ally|contact|rival|enemy",\n'
                '      "suggested_name": "Name if introduced",\n'
                '      "suggested_motivation": "Brief motivation"\n'
                '    }\n'
                '  ]\n'
                '}\n'
                'Populate suggested_entities with any NPCs you introduce in the scene.'
            )
            expect_entities = True

        prompt = f"""You are a narrator for a gritty sci-fi tabletop RPG.

## Context
- Career: {request.career}
- Assignment: {request.assignment}
- Term: {request.term}
- Character Name: {request.character_context.name}
- Event Text: "{request.event_text}"
- Recent Events: {prior_events_text}

## Instructions
{system_instruction}

Write in second person ("You..."). Set the scene in a gritty, grounded sci-fi setting.
The dice determine outcomes — you add texture, not mechanics.

## Response Format
{format_block}"""

        try:
            response_text = await llm.generate(prompt)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                entities = []
                if expect_entities:
                    entities = [
                        SuggestedEntity(**e)
                        for e in data.get("suggested_entities", [])
                    ]
                raw_desc = data.get("description", response_text)
                if isinstance(raw_desc, list):
                    raw_desc = "\n".join(str(item) for item in raw_desc)
                elif not isinstance(raw_desc, str):
                    raw_desc = str(raw_desc)
                return EventDescriptionResponse(
                    description=raw_desc,
                    suggested_entities=entities,
                    mode=mode,
                    guidance_used=request.guidance,
                )
            desc_match = re.search(
                r'"description"\s*:\s*"((?:[^"\\]|\\.)*)"', response_text
            )
            fallback_desc = (
                desc_match.group(1).encode().decode("unicode_escape")
                if desc_match
                else response_text
            )
            return EventDescriptionResponse(
                description=fallback_desc,
                mode=mode,
                guidance_used=request.guidance,
            )
        except json.JSONDecodeError:
            return EventDescriptionResponse(
                description=response_text,
                mode=mode,
                guidance_used=request.guidance,
            )
        except Exception as e:
            raise RuntimeError(f"Event description generation failed: {e}")

    async def generate_npc_details(
        self, request: NPCDetailsRequest
    ) -> NPCDetailsResponse:
        llm = self._get_llm()
        mode = request.verbosity
        guidance_suffix = self._build_guidance_suffix(request.guidance)

        existing_info = (
            "\n".join(
                f"- {k}: {v}" for k, v in request.existing_fields.items() if v
            )
            if request.existing_fields
            else "None provided."
        )

        system_instruction = NPC_SYSTEM_PROMPTS[mode] + guidance_suffix

        # Different response format per mode
        if mode == VerbosityLevel.BRIEF:
            format_block = 'Respond with a JSON object: {"name": "Full Name"}'
        elif mode == VerbosityLevel.INSPIRATION:
            format_block = (
                'Respond with a JSON object:\n'
                '{\n'
                '  "name": "Full name (only if not already provided)",\n'
                '  "personality": "2-3 key personality traits",\n'
                '  "motivation": "What drives this person regarding the PC"\n'
                '}'
            )
        else:  # FULL
            format_block = (
                'Respond with a JSON object:\n'
                '{\n'
                '  "name": "Full name (only if not already provided)",\n'
                '  "personality": "2-3 sentences about personality",\n'
                '  "motivation": "2-3 sentences about what drives them",\n'
                '  "appearance": "1-2 sentence physical description",\n'
                '  "quirks": ["habit1", "habit2", "habit3"]\n'
                '}'
            )

        prompt = f"""You are a character designer for a gritty sci-fi tabletop RPG.

## Context
- NPC Type: {request.npc_type} (their relationship to the player character)
- Career Context: {request.context.career}
- Player Character: {request.context.character_name}
- Event That Created This NPC: "{request.context.event_text}"
- Already Known About NPC: {existing_info}

## Instructions
{system_instruction}

Create a believable NPC for a gritty sci-fi setting. Consider their role as {request.npc_type}.

## Response Format
{format_block}"""

        try:
            response_text = await llm.generate(prompt)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                name = data.get("name", "Unknown")
                if request.existing_fields and request.existing_fields.get("name"):
                    name = request.existing_fields["name"]
                return NPCDetailsResponse(
                    name=name,
                    personality=data.get("personality"),
                    motivation=data.get("motivation"),
                    appearance=data.get("appearance"),
                    quirks=data.get("quirks"),
                    mode=mode,
                    guidance_used=request.guidance,
                )
            return NPCDetailsResponse(
                name="Generated NPC",
                motivation=response_text,
                mode=mode,
                guidance_used=request.guidance,
            )
        except json.JSONDecodeError:
            return NPCDetailsResponse(
                name="Generated NPC",
                motivation=response_text,
                mode=mode,
                guidance_used=request.guidance,
            )
        except Exception as e:
            raise RuntimeError(f"NPC details generation failed: {e}")

    async def suggest_connections(
        self, request: SuggestConnectionsRequest
    ) -> SuggestConnectionsResponse:
        if len(request.entities) < 2:
            return SuggestConnectionsResponse(suggestions=[])

        llm = self._get_llm()

        entities_text = "\n".join(
            f"- [{e.id}] {e.name} ({e.type}, career: {e.career or 'unknown'})"
            for e in request.entities
        )

        prompt = f"""You are a story consultant for a gritty sci-fi tabletop RPG. Suggest meaningful connections between entities.

## Character
- Name: {request.character.name}
- Career History: {", ".join(request.character.career_history)}

## Entities to Connect
{entities_text}

## Instructions
Suggest 1-3 logical connections between these entities. Consider:
- Shared careers or backgrounds
- Potential conflicts or alliances
- Locations where they might meet
- Power dynamics or hierarchies

## Response Format
Respond with a JSON object:
{{
  "suggestions": [
    {{
      "source": "entity_id",
      "target": "entity_id",
      "relationship": "works_for|rivals_with|stationed_at|etc",
      "description": "Brief explanation of the connection"
    }}
  ]
}}"""

        try:
            response_text = await llm.generate(prompt)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                return SuggestConnectionsResponse(
                    suggestions=[
                        ConnectionSuggestion(**s) for s in data.get("suggestions", [])
                    ]
                )
            return SuggestConnectionsResponse(suggestions=[])
        except (json.JSONDecodeError, Exception) as e:
            logger.warning("Failed to generate connection suggestions: %s", e)
            return SuggestConnectionsResponse(suggestions=[])
