"""Tests for document ingestion endpoint."""

import pytest


@pytest.mark.asyncio
async def test_ingest_text_file(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "Captain Zara led the Imperial Navy fleet to the outer rim."
    response = await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "indexed"
    assert data["chunks"] >= 1
    assert data["source_id"].startswith("doc_")


@pytest.mark.asyncio
async def test_ingest_creates_chunks_for_long_document(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    long_content = " ".join(["word"] * 1000)
    response = await client.post(
        "/ingest",
        files={"file": ("long.txt", long_content, "text/plain")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["chunks"] >= 2


@pytest.mark.asyncio
async def test_ingest_stores_in_pinecone(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "Captain Zara commanded the fleet."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    assert len(mock_pinecone.call_history) > 0
    upsert_call = next(
        (c for c in mock_pinecone.call_history if c["method"] == "upsert_batch"), None
    )
    assert upsert_call is not None

    assert len(mock_pinecone.vectors) >= 1


@pytest.mark.asyncio
async def test_ingest_embeddings_are_1536_dim(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "The starship left port at dawn."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    for vec_data in mock_pinecone.vectors.values():
        assert len(vec_data["values"]) == 1536


@pytest.mark.asyncio
async def test_ingest_metadata_has_access_scope(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "A simple text document."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    for vec_data in mock_pinecone.vectors.values():
        assert "access_scope" in vec_data["metadata"]
        assert vec_data["metadata"]["access_scope"] == ["public"]


@pytest.mark.asyncio
async def test_ingest_metadata_has_entities(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "Captain Zara at Imperial Station with Imperial Navy."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    for vec_data in mock_pinecone.vectors.values():
        assert "entities" in vec_data["metadata"]
        entities = vec_data["metadata"]["entities"]
        assert "Captain Zara" in entities
        assert "Imperial Station" in entities
        assert "Imperial Navy" in entities


@pytest.mark.asyncio
async def test_ingest_metadata_has_chunk_index(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "Simple text content."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    for vec_data in mock_pinecone.vectors.values():
        assert "chunk_index" in vec_data["metadata"]
        assert isinstance(vec_data["metadata"]["chunk_index"], int)


@pytest.mark.asyncio
async def test_ingest_metadata_has_text(ingest_client):
    client, mock_embeddings, mock_llm, mock_pinecone = ingest_client

    content = "This is the actual chunk text."
    await client.post(
        "/ingest",
        files={"file": ("test.txt", content, "text/plain")},
    )

    for vec_data in mock_pinecone.vectors.values():
        assert "text" in vec_data["metadata"]
        assert len(vec_data["metadata"]["text"]) > 0


@pytest.mark.asyncio
async def test_ingest_rejects_empty_file(ingest_client):
    client, *_ = ingest_client

    response = await client.post(
        "/ingest",
        files={"file": ("empty.txt", "", "text/plain")},
    )

    assert response.status_code == 400
