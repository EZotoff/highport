"""Narrative generation service for AI-powered character generation assistance."""

import json
import logging
import re
from typing import Optional

from providers.gemini import GeminiProvider
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


VERBOSITY_INSTRUCTIONS = {
    VerbosityLevel.MINIMAL: "Keep your response very brief - just 1-2 sentences. Only essential facts.",
    VerbosityLevel.STRUCTURED: "Provide a medium-length response with key details - 2-4 sentences with clear structure.",
    VerbosityLevel.RICH: "Provide a detailed, immersive response - full paragraph with vivid descriptions, atmosphere, and character.",
}


class NarrativeGenerator:
    """Service for generating narrative content using AI."""

    def __init__(self, llm: Optional[GeminiProvider] = None):
        """Initialize the narrative generator.

        Args:
            llm: Optional LLM provider. If not provided, creates a new GeminiProvider.
        """
        self._llm = llm

    def _get_llm(self) -> GeminiProvider:
        """Get or create the LLM provider."""
        if self._llm is None:
            self._llm = GeminiProvider()
        return self._llm

    async def generate_event_description(
        self, request: EventDescriptionRequest
    ) -> EventDescriptionResponse:
        """Generate a narrative description for a career event.

        Args:
            request: The event description request with context.

        Returns:
            EventDescriptionResponse with description and suggested entities.
        """
        llm = self._get_llm()

        prior_events_text = ""
        if request.character_context.prior_events:
            prior_events_text = "\n".join(
                f"- {event}" for event in request.character_context.prior_events[-3:]
            )
        else:
            prior_events_text = "No prior events recorded."

        prompt = f"""You are a narrator for the Traveller tabletop RPG. Generate a dramatic description for a career event.

## Context
- Career: {request.career}
- Assignment: {request.assignment}  
- Term: {request.term}
- Character Name: {request.character_context.name}
- Event Text: "{request.event_text}"
- Recent Events: {prior_events_text}

## Instructions
{VERBOSITY_INSTRUCTIONS[request.verbosity]}

Write in second person ("You..."). Set the scene in the gritty, realistic sci-fi universe of Traveller.
If the event mentions gaining an ally, contact, rival, or enemy, briefly describe who they might be.

## Response Format
Respond with a JSON object:
{{
  "description": "Your narrative text here...",
  "suggested_entities": [
    {{
      "type": "npc",
      "relationship": "ally|contact|rival|enemy",
      "suggested_name": "Name if appropriate",
      "suggested_motivation": "Brief motivation"
    }}
  ]
}}

Only include suggested_entities if the event implies new relationships. Keep the array empty otherwise."""

        try:
            response_text = await llm.generate(prompt)
            # Parse JSON from response
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                return EventDescriptionResponse(
                    description=data.get("description", response_text),
                    suggested_entities=[
                        SuggestedEntity(**e) for e in data.get("suggested_entities", [])
                    ],
                )
            else:
                return EventDescriptionResponse(description=response_text)
        except json.JSONDecodeError:
            return EventDescriptionResponse(description=response_text)
        except Exception as e:
            raise RuntimeError(f"Event description generation failed: {e}")

    async def generate_npc_details(
        self, request: NPCDetailsRequest
    ) -> NPCDetailsResponse:
        """Generate detailed NPC information.

        Args:
            request: The NPC details request with context.

        Returns:
            NPCDetailsResponse with personality, motivation, etc.
        """
        llm = self._get_llm()

        existing_info = ""
        if request.existing_fields:
            existing_info = "\n".join(
                f"- {k}: {v}" for k, v in request.existing_fields.items() if v
            )
        else:
            existing_info = "None provided."

        prompt = f"""You are a character designer for the Traveller tabletop RPG. Generate details for an NPC.

## Context
- NPC Type: {request.npc_type} (their relationship to the player character)
- Career Context: {request.context.career}
- Player Character: {request.context.character_name}
- Event That Created This NPC: "{request.context.event_text}"
- Already Known About NPC: {existing_info}

## Instructions
{VERBOSITY_INSTRUCTIONS[request.verbosity]}

Create a believable NPC for the gritty sci-fi Traveller universe. Consider their role as {request.npc_type}.

## Response Format
Respond with a JSON object:
{{
  "name": "Full name (only if not already provided)",
  "personality": "2-3 key personality traits",
  "motivation": "What drives this person, especially regarding the PC",
  "appearance": "Physical description (only for rich verbosity)",
  "quirks": ["habit1", "habit2"]
}}

Include only the fields appropriate for the verbosity level:
- minimal: just name
- structured: name, personality, motivation
- rich: all fields"""

        try:
            response_text = await llm.generate(prompt)
            json_match = re.search(r"\{[\s\S]*\}", response_text)
            if json_match:
                data = json.loads(json_match.group())
                # Use existing name if provided
                name = data.get("name", "Unknown")
                if request.existing_fields and request.existing_fields.get("name"):
                    name = request.existing_fields["name"]
                return NPCDetailsResponse(
                    name=name,
                    personality=data.get("personality"),
                    motivation=data.get("motivation"),
                    appearance=data.get("appearance"),
                    quirks=data.get("quirks"),
                )
            else:
                return NPCDetailsResponse(
                    name="Generated NPC", motivation=response_text
                )
        except json.JSONDecodeError:
            return NPCDetailsResponse(name="Generated NPC", motivation=response_text)
        except Exception as e:
            raise RuntimeError(f"NPC details generation failed: {e}")

    async def suggest_connections(
        self, request: SuggestConnectionsRequest
    ) -> SuggestConnectionsResponse:
        """Suggest connections between entities based on context.

        Args:
            request: The connection suggestion request.

        Returns:
            SuggestConnectionsResponse with suggested connections.
        """
        if len(request.entities) < 2:
            return SuggestConnectionsResponse(suggestions=[])

        llm = self._get_llm()

        entities_text = "\n".join(
            f"- [{e.id}] {e.name} ({e.type}, career: {e.career or 'unknown'})"
            for e in request.entities
        )

        prompt = f"""You are a story consultant for the Traveller tabletop RPG. Suggest meaningful connections between entities.

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
            else:
                return SuggestConnectionsResponse(suggestions=[])
        except (json.JSONDecodeError, Exception) as e:
            logger.warning("Failed to generate connection suggestions: %s", e)
            return SuggestConnectionsResponse(suggestions=[])
