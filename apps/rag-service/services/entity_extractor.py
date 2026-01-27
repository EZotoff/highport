"""Entity extraction service using LLM.

Extracts named entities (characters, locations, factions) from text chunks.
"""

import json
import re
from dataclasses import dataclass
from typing import Protocol


class LLMProtocol(Protocol):
    async def generate(self, prompt: str) -> str: ...


ENTITY_EXTRACTION_PROMPT = """
Extract named entities from the following text. Return a JSON object with:
- characters: list of character/person names
- locations: list of place names
- factions: list of organization/faction names

Only include entities that are explicitly mentioned. If none found for a category, use an empty list.

Text:
{text}

JSON:
"""


@dataclass
class ExtractedEntities:
    characters: list[str]
    locations: list[str]
    factions: list[str]

    def all_entities(self) -> list[str]:
        return self.characters + self.locations + self.factions


async def extract_entities(text: str, llm: LLMProtocol) -> ExtractedEntities:
    prompt = ENTITY_EXTRACTION_PROMPT.format(text=text)
    response = await llm.generate(prompt)

    try:
        json_match = re.search(r"\{[^{}]*\}", response, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(response)

        return ExtractedEntities(
            characters=data.get("characters", []),
            locations=data.get("locations", []),
            factions=data.get("factions", []),
        )
    except (json.JSONDecodeError, AttributeError):
        return ExtractedEntities(characters=[], locations=[], factions=[])
