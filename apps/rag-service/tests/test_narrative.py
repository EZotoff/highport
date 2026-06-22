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
        guidance = getattr(request, "guidance", None)

        # Structurally different output per verbosity mode
        if verbosity == "brief":
            desc = "You made an enemy."
            entities = []
        elif verbosity == "full":
            desc = (
                "The dimly lit officers' mess fell silent as Lt. Commander Vasquez "
                "slammed his drink on the bar. Your quick thinking during the fleet "
                "exercise had shown him up in front of Admiral Chen, and he would "
                "never forget the humiliation. From that moment, you had made an "
                "enemy for life—one with connections throughout the Imperial Navy."
            )
            entities = [
                SuggestedEntity(
                    type="npc",
                    relationship="rival",
                    suggested_name="Lt. Cmdr Vasquez",
                    suggested_motivation="Publicly humiliated during fleet exercise",
                )
            ]
        else:  # inspiration (default)
            desc = (
                "During your time in the navy, you made a rival who now seeks "
                "to undermine you."
            )
            entities = []

        return EventDescriptionResponse(
            description=desc,
            suggested_entities=entities,
            mode=verbosity,
            guidance_used=guidance,
        )

    async def generate_npc_details(self, request):
        self.calls.append(("npc_details", request))
        if self.should_raise:
            raise self.should_raise

        verbosity = request.verbosity
        guidance = getattr(request, "guidance", None)
        existing_name = (
            request.existing_fields.get("name", "Unknown NPC")
            if request.existing_fields
            else "Unknown NPC"
        )

        if verbosity == "brief":
            return NPCDetailsResponse(
                name=existing_name,
                mode=verbosity,
                guidance_used=guidance,
            )
        elif verbosity == "inspiration":
            return NPCDetailsResponse(
                name=existing_name,
                motivation="Wants revenge",
                personality="Cold and calculating",
                mode=verbosity,
                guidance_used=guidance,
            )
        else:  # full
            return NPCDetailsResponse(
                name=existing_name,
                motivation=(
                    "Believes you stole his promotion through family connections. "
                    "Has sworn to see your career ruined."
                ),
                personality=(
                    "Cold, calculating, meticulous. Never raises his voice but "
                    "his silence is more terrifying."
                ),
                appearance=(
                    "Tall with sharp angular features. Always wears an immaculate "
                    "uniform with every medal polished."
                ),
                quirks=["Taps fingers when plotting", "Speaks in clipped sentences"],
                mode=verbosity,
                guidance_used=guidance,
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


# ── existing tests ──────────────────────────────────────────────────


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
                "verbosity": "inspiration",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "description" in data
        assert "suggested_entities" in data
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_description_brief_verbosity(client, mock_generator):
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
                "verbosity": "brief",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["description"]) < 50
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_description_full_verbosity(client, mock_generator):
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
                "verbosity": "full",
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
                "verbosity": "inspiration",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Vasquez"
        assert "motivation" in data
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_details_includes_quirks_for_full(client, mock_generator):
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
                "verbosity": "full",
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
                "verbosity": "inspiration",
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
                "verbosity": "inspiration",
            },
        )
        assert response.status_code == 503
        assert "API key missing" in response.json()["detail"]
    finally:
        clear_dependencies()


# ── new tests: guidance field ───────────────────────────────────────


@pytest.mark.asyncio
async def test_event_description_with_guidance_field(client, mock_generator):
    """Guidance field is passed through and echoed back in the response."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You are betrayed by a close ally.",
                "career": "navy",
                "assignment": "line_crew",
                "term": 2,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "inspiration",
                "guidance": "Make the betrayal subtle and political, not violent.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["guidance_used"] == "Make the betrayal subtle and political, not violent."
        assert data["mode"] == "inspiration"
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_description_without_guidance_still_works(client, mock_generator):
    """Existing callers that omit guidance must still work (backward compat)."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You receive a commendation.",
                "career": "navy",
                "assignment": "line_crew",
                "term": 1,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "brief",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["guidance_used"] is None
        assert data["mode"] == "brief"
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_details_with_guidance_field(client, mock_generator):
    """Guidance is passed to NPC detail generation and echoed back."""
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
                "verbosity": "full",
                "guidance": "Make this NPC a former mentor, not just a bully.",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["guidance_used"] == "Make this NPC a former mentor, not just a bully."
        assert data["mode"] == "full"
    finally:
        clear_dependencies()


# ── new tests: structural differences per mode ──────────────────────


@pytest.mark.asyncio
async def test_event_brief_mode_no_entities(client, mock_generator):
    """BRIEF mode returns short text and empty suggested_entities."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You are drafted into a secret mission.",
                "career": "navy",
                "assignment": "intelligence",
                "term": 3,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "brief",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "brief"
        assert len(data["description"]) < 50
        assert data["suggested_entities"] == []
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_inspiration_mode_short_text(client, mock_generator):
    """INSPIRATION mode returns medium text without entities."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You uncover a smuggling ring.",
                "career": "navy",
                "assignment": "intelligence",
                "term": 2,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "inspiration",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "inspiration"
        assert len(data["description"]) > 0
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_event_full_mode_populated_entities(client, mock_generator):
    """FULL mode returns long text with populated suggested_entities."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/event-description",
            json={
                "event_text": "You foil an assassination attempt.",
                "career": "navy",
                "assignment": "command",
                "term": 4,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "full",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "full"
        assert len(data["description"]) > 100
        assert len(data["suggested_entities"]) > 0
        assert data["suggested_entities"][0]["type"] == "npc"
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_brief_mode_only_name(client, mock_generator):
    """NPC BRIEF mode returns only name, no extra fields."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/npc-details",
            json={
                "npc_type": "ally",
                "context": {
                    "event_text": "You gain an ally",
                    "career": "navy",
                    "character_name": "Zara",
                },
                "existing_fields": {"name": "Marcus Chen"},
                "verbosity": "brief",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "brief"
        assert data["name"] == "Marcus Chen"
        assert data["personality"] is None
        assert data["motivation"] is None
        assert data["appearance"] is None
        assert data["quirks"] is None
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_npc_full_mode_all_fields_populated(client, mock_generator):
    """NPC FULL mode returns all fields populated."""
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/npc-details",
            json={
                "npc_type": "enemy",
                "context": {
                    "event_text": "You gain an enemy",
                    "career": "navy",
                    "character_name": "Zara",
                },
                "existing_fields": {"name": "Vasquez"},
                "verbosity": "full",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "full"
        assert data["name"] is not None
        assert data["personality"] is not None
        assert data["motivation"] is not None
        assert data["appearance"] is not None
        assert data["quirks"] is not None
        assert len(data["quirks"]) > 0
    finally:
        clear_dependencies()


# ── new test: guidance is incorporated into the prompt ───────────────


@pytest.mark.asyncio
async def test_guidance_reaches_generator_request(client, mock_generator):
    """Verify that the guidance string is present on the request object
    the generator receives, confirming it would be incorporated into
    the LLM prompt."""
    set_dependencies(generator=mock_generator)
    try:
        await client.post(
            "/narrative/event-description",
            json={
                "event_text": "A mysterious signal arrives.",
                "career": "navy",
                "assignment": "communications",
                "term": 2,
                "character_context": {"name": "Zara", "characteristics": {}},
                "verbosity": "full",
                "guidance": "The signal should hint at a First Contact scenario.",
            },
        )
        assert len(mock_generator.calls) >= 1
        _, request = mock_generator.calls[0]
        assert request.guidance == "The signal should hint at a First Contact scenario."
        assert request.verbosity == "full"
    finally:
        clear_dependencies()
