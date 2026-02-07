"""Tests for the narrative generation API endpoints."""

import pytest

from schemas.narrative import (
    EventDescriptionResponse,
    NPCDetailsResponse,
    SuggestConnectionsResponse,
    SuggestedEntity,
    ConnectionSuggestion,
)
from routers.narrative import set_dependencies, clear_dependencies


class MockNarrativeGenerator:
    """Mock generator that returns predictable responses for testing."""

    def __init__(self, responses=None, should_raise=None):
        self.responses = responses or {}
        self.should_raise = should_raise
        self.calls = []

    async def generate_event_description(self, request):
        self.calls.append(("event_description", request))
        if self.should_raise:
            raise self.should_raise

        verbosity = request.verbosity

        descriptions = {
            "minimal": "You made an enemy.",
            "structured": "During your time in the navy, you made a rival who now seeks to undermine you.",
            "rich": "The dimly lit officers' mess fell silent as Lt. Commander Vasquez slammed his drink on the bar. Your quick thinking during the fleet exercise had shown him up in front of Admiral Chen, and he would never forget the humiliation. From that moment, you had made an enemy for life—one with connections throughout the Imperial Navy.",
        }

        return EventDescriptionResponse(
            description=descriptions.get(verbosity, descriptions["structured"]),
            suggested_entities=[
                SuggestedEntity(
                    type="npc",
                    relationship="rival",
                    suggested_name="Lt. Cmdr Vasquez",
                    suggested_motivation="Publicly humiliated during fleet exercise",
                )
            ],
        )

    async def generate_npc_details(self, request):
        self.calls.append(("npc_details", request))
        if self.should_raise:
            raise self.should_raise

        verbosity = request.verbosity
        existing_name = (
            request.existing_fields.get("name", "Unknown NPC")
            if request.existing_fields
            else "Unknown NPC"
        )

        if verbosity == "minimal":
            return NPCDetailsResponse(name=existing_name)
        elif verbosity == "structured":
            return NPCDetailsResponse(
                name=existing_name,
                motivation="Wants revenge",
                personality="Cold and calculating",
            )
        else:
            return NPCDetailsResponse(
                name=existing_name,
                motivation="Believes you stole his promotion through family connections. Has sworn to see your career ruined.",
                personality="Cold, calculating, meticulous. Never raises his voice but his silence is more terrifying.",
                appearance="Tall with sharp angular features. Always wears an immaculate uniform with every medal polished.",
                quirks=["Taps fingers when plotting", "Speaks in clipped sentences"],
            )

    async def suggest_connections(self, request):
        self.calls.append(("suggest_connections", request))
        if self.should_raise:
            raise self.should_raise

        suggestions = []
        entities = request.entities
        if len(entities) >= 2:
            suggestions.append(
                ConnectionSuggestion(
                    source=entities[0].id,
                    target=entities[1].id,
                    relationship="knows",
                    description="They served together in the past.",
                )
            )

        return SuggestConnectionsResponse(suggestions=suggestions)


@pytest.fixture
def mock_generator():
    return MockNarrativeGenerator()


@pytest.mark.asyncio
async def test_event_description_endpoint_returns_200(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You make a rival in the officer corps",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {
                    "name": "Zara",
                    "characteristics": {"STR": 7, "DEX": 9},
                    "prior_events": [],
                },
                "verbosity": "structured",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert "suggested_entities" in data
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_description_minimal_verbosity(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "Test event",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {"name": "Test", "characteristics": {}},
                "verbosity": "minimal",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["description"]) < 50
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_description_rich_verbosity(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "Test event",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {"name": "Test", "characteristics": {}},
                "verbosity": "rich",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["description"]) > 100
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_details_endpoint_returns_200(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/npc-details",
            json={
                "npc_type": "rival",
                "context": {
                    "event_text": "You make a rival",
                    "career": "navy",
                    "character_name": "Zara",
                },
                "existing_fields": {"name": "Vasquez"},
                "verbosity": "structured",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Vasquez"
        assert "motivation" in data
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_details_includes_quirks_for_rich(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/npc-details",
            json={
                "npc_type": "rival",
                "context": {
                    "event_text": "You make a rival",
                    "career": "navy",
                    "character_name": "Zara",
                },
                "existing_fields": {"name": "Vasquez"},
                "verbosity": "rich",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "quirks" in data
        assert len(data["quirks"]) > 0
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_suggest_connections_endpoint(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/suggest-connections",
            json={
                "entities": [
                    {"id": "npc1", "name": "Vasquez", "type": "rival"},
                    {"id": "npc2", "name": "Chen", "type": "ally"},
                ],
                "character": {"name": "Zara", "career_history": ["navy"]},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_error_handling_value_error(client):
    error_generator = MockNarrativeGenerator(should_raise=ValueError("Invalid input"))
    set_dependencies(generator=error_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "Test",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {"name": "Test", "characteristics": {}},
                "verbosity": "structured",
            },
        )
        assert response.status_code == 400
        assert "Invalid input" in response.json()["detail"]
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_error_handling_runtime_error(client):
    error_generator = MockNarrativeGenerator(
        should_raise=RuntimeError("API key missing")
    )
    set_dependencies(generator=error_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "Test",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {"name": "Test", "characteristics": {}},
                "verbosity": "structured",
            },
        )
        assert response.status_code == 503
        assert "API key missing" in response.json()["detail"]
    finally:
        clear_dependencies()
