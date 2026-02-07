import pytest

from mocks.mock_embeddings import EMBEDDING_DIM


@pytest.mark.asyncio
async def test_embed_returns_1536_dim_vector(embeddings):
    result = await embeddings.embed("test")
    assert isinstance(result, list)
    assert len(result) == EMBEDDING_DIM


@pytest.mark.asyncio
async def test_embed_returns_floats(embeddings):
    result = await embeddings.embed("test")
    assert all(isinstance(v, float) for v in result)


@pytest.mark.asyncio
async def test_embed_is_deterministic(embeddings):
    result1 = await embeddings.embed("same text")
    result2 = await embeddings.embed("same text")
    assert result1 == result2


@pytest.mark.asyncio
async def test_embed_different_texts_produce_different_vectors(embeddings):
    result1 = await embeddings.embed("text one")
    result2 = await embeddings.embed("text two")
    assert result1 != result2


@pytest.mark.asyncio
async def test_embed_batch_returns_list_of_vectors(embeddings):
    texts = ["first", "second", "third"]
    results = await embeddings.embed_batch(texts)
    assert len(results) == 3
    assert all(len(v) == EMBEDDING_DIM for v in results)


@pytest.mark.asyncio
async def test_call_history_tracks_embed_calls(embeddings):
    await embeddings.embed("test")
    assert len(embeddings.call_history) == 1
    assert embeddings.call_history[0]["method"] == "embed"
