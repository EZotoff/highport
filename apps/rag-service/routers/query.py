"""Query router for RAG service."""

import json
from typing import AsyncGenerator

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from providers.base import LLMProvider
from providers.embeddings import EmbeddingsClient
from providers.gemini import GeminiProvider
from services.pinecone_client import PineconeService

router = APIRouter(prefix="/query", tags=["query"])


class QueryRequest(BaseModel):
    query: str


# Dependency overrides (following pattern from ingest.py)
_embeddings_override = None
_llm_override = None
_pinecone_override = None


def set_dependencies(
    embeddings=None,
    llm=None,
    pinecone=None,
) -> None:
    global _embeddings_override, _llm_override, _pinecone_override
    _embeddings_override = embeddings
    _llm_override = llm
    _pinecone_override = pinecone


def clear_dependencies() -> None:
    global _embeddings_override, _llm_override, _pinecone_override
    _embeddings_override = None
    _llm_override = None
    _pinecone_override = None


def _get_embeddings():
    if _embeddings_override is not None:
        return _embeddings_override
    return EmbeddingsClient()


def _get_llm() -> LLMProvider:
    if _llm_override is not None:
        return _llm_override
    return GeminiProvider()


def _get_pinecone() -> PineconeService:
    if _pinecone_override is not None:
        return _pinecone_override
    return PineconeService()


@router.post("")
async def query(
    request: QueryRequest,
    x_user_id: str = Header(None, alias="X-User-Id"),
    x_character_id: str = Header(None, alias="X-Character-Id"),
    x_is_gm: str = Header("false", alias="X-Is-GM"),
):
    """Query the RAG system with scope-based filtering.

    Args:
        request: The query request body.
        x_user_id: User ID header.
        x_character_id: Character ID header.
        x_is_gm: GM status header.

    Returns:
        StreamingResponse: Server-Sent Events stream.
    """
    embeddings = _get_embeddings()
    llm = _get_llm()
    pinecone = _get_pinecone()

    # 1. Build scope array from headers
    scope = ["public"]
    if x_is_gm and x_is_gm.lower() == "true":
        scope.append("gm")
    if x_character_id:
        scope.append(f"char:{x_character_id}")
        scope.append("party")

    # 2. Embed the query
    try:
        query_embedding = await embeddings.embed(request.query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {e}")

    # 3. Query Pinecone with scope filter
    try:
        results = await pinecone.query(
            query_embedding,
            filter={"access_scope": {"$in": scope}},
            top_k=5,
            include_metadata=True,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector search failed: {e}")

    # 4. If no results, return default message
    if not results:

        async def generate_empty():
            yield f"data: {json.dumps({'text': 'You do not recall any information.'})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(generate_empty(), media_type="text/event-stream")

    # 5. Stream LLM response with context
    context = [
        r.metadata.get("text", "")
        for r in results
        if r.metadata and "text" in r.metadata
    ]

    async def generate() -> AsyncGenerator[str, None]:
        try:
            async for chunk in llm.stream_with_context(request.query, context):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
