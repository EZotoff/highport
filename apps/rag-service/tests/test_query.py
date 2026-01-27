"""Tests for query router."""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from mocks.mock_embeddings import MockEmbeddings
from mocks.mock_gemini import MockGeminiProvider
from mocks.mock_pinecone import MockPineconeIndex
from routers.query import set_dependencies, clear_dependencies


@pytest.fixture(autouse=True)
def setup_dependencies():
    """Setup mock dependencies for all tests."""
    set_dependencies(
        embeddings=MockEmbeddings(),
        llm=MockGeminiProvider(),
        pinecone=MockPineconeIndex(),
    )
    yield
    clear_dependencies()


@pytest.mark.asyncio
async def test_query_flow():
    """Test full query flow with mocks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Setup Pinecone mock data
        pinecone = MockPineconeIndex()
        # MockPineconeIndex doesn't persist data across instantiations in this setup unless we share the instance
        # So we need to access the one injected
        from routers.query import _get_pinecone

        pinecone = _get_pinecone()

        await pinecone.upsert(
            id="test_doc",
            vector=[0.1] * 1536,
            metadata={
                "text": "The ancient artifact is hidden in the cave.",
                "access_scope": ["public"],
            },
        )

        # 2. Make query request
        response = await client.post(
            "/query",
            json={"query": "Where is the artifact?"},
            headers={"X-User-Id": "user1", "X-Is-GM": "false"},
        )

        assert response.status_code == 200

        # 3. Verify SSE stream
        content = ""
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                payload = line[6:]
                if payload == "[DONE]":
                    break
                import json

                data = json.loads(payload)
                if "text" in data:
                    content += data["text"]

        # Verify response contains expected text (from MockGeminiProvider)
        assert "Context-aware response" in content
        assert "Where is the artifact?" in content


@pytest.mark.asyncio
async def test_query_scope_filtering():
    """Test that scope headers are correctly passed to Pinecone filter."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Access the injected mock to check call history
        from routers.query import _get_pinecone

        pinecone = _get_pinecone()

        # Query as GM
        await client.post(
            "/query",
            json={"query": "secret info"},
            headers={"X-User-Id": "gm1", "X-Is-GM": "true"},
        )

        # Verify query was called with correct filter
        last_call = pinecone.call_history[-1]
        assert last_call["method"] == "query"
        assert "filter" in last_call
        assert "access_scope" in last_call["filter"]
        scope_filter = last_call["filter"]["access_scope"]["$in"]
        assert "gm" in scope_filter
        assert "public" in scope_filter


@pytest.mark.asyncio
async def test_empty_results():
    """Test response when no documents are found."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/query",
            json={"query": "unknown topic"},
        )

        assert response.status_code == 200
        content = ""
        async for line in response.aiter_lines():
            if line.startswith("data: "):
                payload = line[6:]
                if payload != "[DONE]":
                    import json

                    data = json.loads(payload)
                    content += data.get("text", "")

        assert "You do not recall any information" in content
