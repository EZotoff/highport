import pytest
import pytest_asyncio


class MockPineconeWithUpdate:
    def __init__(self, vectors: dict | None = None):
        self.vectors = vectors or {}
        self.call_history: list[dict] = []

    async def query_by_filter(
        self, filter_dict: dict, top_k: int = 10000
    ) -> list[dict]:
        self.call_history.append(
            {"method": "query_by_filter", "filter": filter_dict, "top_k": top_k}
        )
        source_id = filter_dict.get("source_id", {}).get("$eq", "")
        return [
            {"id": vid, "metadata": data.get("metadata", {})}
            for vid, data in self.vectors.items()
            if data.get("metadata", {}).get("source_id") == source_id
        ]

    async def update_metadata(self, id: str, metadata: dict) -> None:
        self.call_history.append(
            {"method": "update_metadata", "id": id, "metadata": metadata}
        )
        if id in self.vectors:
            self.vectors[id]["metadata"].update(metadata)


@pytest.fixture
def mock_pinecone_with_vectors():
    return MockPineconeWithUpdate(
        vectors={
            "chunk_1": {
                "metadata": {"source_id": "doc_123", "access_scope": ["public"]}
            },
            "chunk_2": {
                "metadata": {"source_id": "doc_123", "access_scope": ["public"]}
            },
            "chunk_3": {"metadata": {"source_id": "doc_456", "access_scope": ["gm"]}},
        }
    )


@pytest.fixture
def empty_mock_pinecone():
    return MockPineconeWithUpdate(vectors={})


@pytest_asyncio.fixture
async def scope_client(mock_pinecone_with_vectors):
    from httpx import AsyncClient, ASGITransport
    from main import app
    from routers.scope import set_scope_dependencies, clear_scope_dependencies

    set_scope_dependencies(pinecone=mock_pinecone_with_vectors)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, mock_pinecone_with_vectors
    clear_scope_dependencies()


@pytest_asyncio.fixture
async def empty_scope_client(empty_mock_pinecone):
    from httpx import AsyncClient, ASGITransport
    from main import app
    from routers.scope import set_scope_dependencies, clear_scope_dependencies

    set_scope_dependencies(pinecone=empty_mock_pinecone)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, empty_mock_pinecone
    clear_scope_dependencies()


@pytest.mark.asyncio
async def test_update_scope_success(scope_client):
    client, mock_pinecone = scope_client

    response = await client.post(
        "/update-scope",
        json={
            "source_id": "doc_123",
            "access_scope": ["gm", "secret:ancient-artifact"],
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated_count"] == 2

    assert mock_pinecone.vectors["chunk_1"]["metadata"]["access_scope"] == [
        "gm",
        "secret:ancient-artifact",
    ]
    assert mock_pinecone.vectors["chunk_2"]["metadata"]["access_scope"] == [
        "gm",
        "secret:ancient-artifact",
    ]
    assert mock_pinecone.vectors["chunk_3"]["metadata"]["access_scope"] == ["gm"]


@pytest.mark.asyncio
async def test_update_scope_no_vectors_found(empty_scope_client):
    client, _ = empty_scope_client

    response = await client.post(
        "/update-scope",
        json={"source_id": "doc_nonexistent", "access_scope": ["public"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["updated_count"] == 0


@pytest.mark.asyncio
async def test_update_scope_pinecone_not_configured():
    from httpx import AsyncClient, ASGITransport
    from main import app
    from routers.scope import set_scope_dependencies, clear_scope_dependencies

    set_scope_dependencies(pinecone=None)
    clear_scope_dependencies()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/update-scope",
            json={"source_id": "doc_123", "access_scope": ["public"]},
        )
        assert response.status_code == 503


@pytest.mark.asyncio
async def test_update_scope_validates_request():
    from httpx import AsyncClient, ASGITransport
    from main import app
    from routers.scope import set_scope_dependencies, clear_scope_dependencies

    set_scope_dependencies(pinecone=MockPineconeWithUpdate())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/update-scope", json={})
        assert response.status_code == 422
    clear_scope_dependencies()
