"""Tests for the narrative generation API endpoints."""

from unittest.mock import ANY, AsyncMock

import pytest

from mocks.mock_gemini import MockGeminiProvider
from services.narrative_generator import NarrativeGenerator
from schemas.narrative import (
    EventDescriptionResponse,
    NPCDetailsResponse,
    SuggestConnectionsResponse,
    SuggestedEntity,
    ConnectionSuggestion,
    CharacterSummary,
)
from routers.narrative import set_dependencies, clear_dependencies


class MockNarrativeGenerator:
    """Mock generator that returns predictable responses for testing."""

    def __init__(self, responses=None, should_raise=None):
        self.responses = responses or {}
        self.should_raise = should_raise
        self.calls = []

    async def generate_event_description(self, request, scope):
        self.calls.append(("event_description", request, scope))
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

    async def generate_npc_details(self, request, scope):
        self.calls.append(("npc_details", request, scope))
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

    async def suggest_connections(self, request, scope):
        self.calls.append(("suggest_connections", request, scope))
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

    async def generate_lifepath_review(self, character, campaign_context, scope):
        self.calls.append(("lifepath_review", character, campaign_context, scope))
        if self.should_raise:
            raise self.should_raise
        return self.responses.get("lifepath_review", [])

    async def suggest_cross_character_links(self, characters, shared_history, scope):
        self.calls.append(("cross_character_links", characters, shared_history, scope))
        if self.should_raise:
            raise self.should_raise
        if len(characters) < 2:
            return []
        return self.responses.get("cross_character_links", [])


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
        _, request, _ = mock_generator.calls[0]
        assert request.guidance == "The signal should hint at a First Contact scenario."
        assert request.verbosity == "full"
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_lifepath_review_endpoint_returns_structured_proposals(client):
    proposals = [
        {
            "type": "coherence-edit",
            "title": "Resolve the transfer",
            "description": "Explain why the Navy transfer led to a Scout posting.",
            "target_term": 2,
            "proposed_edit": "Your former captain arranged the transfer.",
        },
        {
            "type": "npc-connection",
            "title": "A familiar patron",
            "description": "Connect Captain Rios to the later exploration mission.",
            "target_term": 3,
            "proposed_edit": None,
        },
        {
            "type": "plot-hook",
            "title": "The missing survey",
            "description": "The original survey data was deliberately falsified.",
            "target_term": 4,
            "proposed_edit": None,
        },
    ]
    generator = MockNarrativeGenerator(responses={"lifepath_review": proposals})
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/lifepath-review",
            json={
                "character": {
                    "id": "char-zara",
                    "name": "Zara",
                    "career": "Scout",
                    "terms": [
                        {
                            "term": 2,
                            "events": ["Transferred to the Scouts"],
                            "mishaps": [],
                            "skills": ["Pilot 1"],
                            "npcs": ["Captain Rios"],
                        }
                    ],
                },
                "campaign_context": ["The Spinward Marches are on the brink of war."],
            },
        )
        assert response.status_code == 200
        assert response.json() == {"proposals": proposals}
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_lifepath_review_minimal_character_returns_empty_proposals(
    client, mock_generator
):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/lifepath-review",
            json={"character": {"id": "char-zara", "name": "Zara"}},
        )
        assert response.status_code == 200
        assert response.json() == {"proposals": []}
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_lifepath_review_accepts_skills_mapping(client, mock_generator):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/lifepath-review",
            json={
                "character": {
                    "id": "test-char-1",
                    "name": "Test",
                    "skills": {"Pilot": 2},
                    "terms": [],
                    "events": [],
                    "mishaps": [],
                    "npcs": [],
                    "chapters": [],
                }
            },
        )

        assert response.status_code == 200
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_lifepath_review_non_gm_scope_excludes_gm(client, monkeypatch):
    generator = NarrativeGenerator(
        llm=MockGeminiProvider(responses={"default": '{"proposals": []}'})
    )
    retrieve_context = AsyncMock(return_value=[])
    monkeypatch.setattr(generator, "_retrieve_context", retrieve_context)
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/lifepath-review",
            headers={"X-Is-GM": "false"},
            json={"character": {"id": "char-zara", "name": "Zara"}},
        )

        assert response.status_code == 200
        retrieve_context.assert_awaited_once_with(ANY, ["public"])
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_cross_character_links_gm_scope_includes_gm(client, monkeypatch):
    generator = NarrativeGenerator(
        llm=MockGeminiProvider(responses={"default": '{"proposals": []}'})
    )
    retrieve_context = AsyncMock(return_value=[])
    monkeypatch.setattr(generator, "_retrieve_context", retrieve_context)
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/cross-character-links",
            headers={"X-Is-GM": "true"},
            json={
                "characters": [
                    {"id": "char-zara", "name": "Zara"},
                    {"id": "char-malik", "name": "Malik"},
                ]
            },
        )

        assert response.status_code == 200
        retrieve_context.assert_awaited_once_with(ANY, ["public", "gm"])
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_lifepath_review_generator_failure_returns_503(client):
    generator = MockNarrativeGenerator(
        should_raise=RuntimeError("LLM provider unavailable")
    )
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/lifepath-review",
            json={"character": {"id": "char-zara", "name": "Zara"}},
        )
        assert response.status_code == 503
        assert response.json() == {"detail": "LLM provider unavailable"}
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_generate_lifepath_review_parses_and_caps_proposals(
    embeddings, pinecone_index
):
    llm_response = """```json
{"proposals": [
  {"type": "coherence-edit", "title": "One", "description": "First", "target_term": 1},
  {"type": "npc-connection", "title": "Two", "description": "Second", "target_term": 2},
  {"type": "plot-hook", "title": "Three", "description": "Third", "target_term": 3},
  {"type": "coherence-edit", "title": "Four", "description": "Fourth", "target_term": 4},
  {"type": "npc-connection", "title": "Five", "description": "Fifth", "target_term": 5},
  {"type": "plot-hook", "title": "Six", "description": "Sixth", "target_term": 6}
]}
```"""
    llm = MockGeminiProvider(responses={"default": llm_response})
    generator = NarrativeGenerator(
        llm=llm,
        embeddings=embeddings,
        vectordb=pinecone_index,
    )

    proposals = await generator.generate_lifepath_review(
        character=CharacterSummary(id="char-zara", name="Zara", career="Scout"),
        campaign_context=["The Spinward Marches are on the brink of war."],
    )

    assert len(proposals) == 5
    assert [proposal["title"] for proposal in proposals] == [
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
    ]
    prompt = llm.call_history[0]["prompt"]
    assert isinstance(prompt, str)
    assert "Zara" in prompt
    assert "The Spinward Marches are on the brink of war." in prompt


@pytest.mark.asyncio
async def test_cross_character_links_endpoint_returns_structured_proposals(client):
    proposals = [
        {
            "source_char_id": "char-zara",
            "target_char_id": "char-malik",
            "relationship": "former_shipmates",
            "description": "They served aboard the same naval cruiser.",
            "source_entity_id": "npc-rios",
            "target_entity_id": None,
        },
        {
            "source_char_id": "char-malik",
            "target_char_id": "char-zara",
            "relationship": "shared_rival",
            "description": "Both crossed Captain Rios during their naval careers.",
            "source_entity_id": None,
            "target_entity_id": "npc-rios",
        },
    ]
    generator = MockNarrativeGenerator(responses={"cross_character_links": proposals})
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/cross-character-links",
            json={
                "characters": [
                    {
                        "id": "char-zara",
                        "name": "Zara",
                        "career": "Navy",
                    },
                    {
                        "id": "char-malik",
                        "name": "Malik",
                        "career": "Navy",
                    },
                ],
                "shared_history": [
                    {
                        "type": "shared_career",
                        "career": "Navy",
                        "character_ids": ["char-zara", "char-malik"],
                    }
                ],
            },
        )

        assert response.status_code == 200
        assert response.json() == {"proposals": proposals}
        assert generator.calls[0][0] == "cross_character_links"
        assert generator.calls[0][2][0]["career"] == "Navy"
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_cross_character_links_single_character_returns_empty_proposals(
    client, mock_generator
):
    set_dependencies(generator=mock_generator)
    try:
        response = await client.post(
            "/narrative/cross-character-links",
            json={"characters": [{"id": "char-zara", "name": "Zara"}]},
        )

        assert response.status_code == 200
        assert response.json() == {"proposals": []}
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_cross_character_links_generator_failure_returns_503(client):
    generator = MockNarrativeGenerator(
        should_raise=ValueError("LLM provider unavailable")
    )
    set_dependencies(generator=generator)
    try:
        response = await client.post(
            "/narrative/cross-character-links",
            json={
                "characters": [
                    {"id": "char-zara", "name": "Zara"},
                    {"id": "char-malik", "name": "Malik"},
                ]
            },
        )

        assert response.status_code == 503
        assert response.json() == {"detail": "LLM provider unavailable"}
    finally:
        clear_dependencies()


@pytest.mark.asyncio
async def test_suggest_cross_character_links_parses_and_caps_proposals(
    embeddings, pinecone_index
):
    llm_response = """```json
{"proposals": [
  {"source_char_id": "char-1", "target_char_id": "char-2", "relationship": "shipmates", "description": "First"},
  {"source_char_id": "char-2", "target_char_id": "char-3", "relationship": "rivals", "description": "Second"},
  {"source_char_id": "char-3", "target_char_id": "char-1", "relationship": "allies", "description": "Third"},
  {"source_char_id": "char-1", "target_char_id": "char-4", "relationship": "contacts", "description": "Fourth"}
]}
```"""
    llm = MockGeminiProvider(responses={"default": llm_response})
    generator = NarrativeGenerator(
        llm=llm,
        embeddings=embeddings,
        vectordb=pinecone_index,
    )

    proposals = await generator.suggest_cross_character_links(
        characters=[
            CharacterSummary(id="char-1", name="Zara", career="Navy"),
            CharacterSummary(id="char-2", name="Malik", career="Navy"),
        ],
        shared_history=[{"type": "shared_career", "career": "Navy"}],
    )

    assert len(proposals) == 3
    assert [proposal["description"] for proposal in proposals] == [
        "First",
        "Second",
        "Third",
    ]
    prompt = llm.call_history[0]["prompt"]
    assert isinstance(prompt, str)
    assert prompt.startswith(
        "You are a story consultant finding narrative connections between Traveller "
        "RPG characters in the same campaign."
    )
    assert "Zara" in prompt
    assert "shared_career" in prompt


@pytest.mark.parametrize("llm_response", ["", '{"proposals": ['])
@pytest.mark.asyncio
async def test_suggest_cross_character_links_partial_or_empty_response_returns_empty(
    llm_response, embeddings, pinecone_index
):
    llm = MockGeminiProvider(responses={"default": llm_response})
    generator = NarrativeGenerator(
        llm=llm,
        embeddings=embeddings,
        vectordb=pinecone_index,
    )

    proposals = await generator.suggest_cross_character_links(
        characters=[
            CharacterSummary(id="char-1", name="Zara"),
            CharacterSummary(id="char-2", name="Malik"),
        ],
    )

    assert proposals == []
