"""Scope management router.

Handles updating access_scope metadata for document vectors in Pinecone.
"""

from dataclasses import dataclass
from typing import Protocol

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(tags=["scope"])


class PineconeUpdateProtocol(Protocol):
    """Protocol for Pinecone service with update capability."""

    async def query_by_filter(
        self, filter_dict: dict, top_k: int = 10000
    ) -> list[dict]: ...

    async def update_metadata(self, id: str, metadata: dict) -> None: ...


class UpdateScopeRequest(BaseModel):
    """Request body for updating document scope."""

    source_id: str
    access_scope: list[str]


@dataclass
class UpdateScopeResult:
    """Result of scope update operation."""

    updated_count: int
    message: str = ""


# Sentinel value to distinguish "no override" from "override set to None"
_UNSET = object()

# Dependency override for testing
_pinecone_override: PineconeUpdateProtocol | None | object = _UNSET


def set_scope_dependencies(pinecone: PineconeUpdateProtocol | None = None) -> None:
    """Set dependency overrides for testing.

    Args:
        pinecone: Pinecone service override with update capability.
                  Pass None to simulate an unconfigured state.
    """
    global _pinecone_override
    _pinecone_override = pinecone


def clear_scope_dependencies() -> None:
    """Clear all dependency overrides."""
    global _pinecone_override
    _pinecone_override = _UNSET

def _get_pinecone() -> PineconeUpdateProtocol | None:
    """Get vector DB provider.

    Returns None if override is explicitly None or if no provider is configured.
    """
    if _pinecone_override is not _UNSET:
        return _pinecone_override  # type: ignore[return-value]

    import os

    vectordb_provider = os.environ.get("VECTORDB_PROVIDER", "chroma").lower()
    if vectordb_provider == "pinecone" and not os.environ.get("PINECONE_API_KEY"):
        return None

    from providers.vectordb import get_vectordb_provider

    try:
        return get_vectordb_provider()
    except ValueError:
        return None


@router.post("/update-scope")
async def update_scope(request: UpdateScopeRequest) -> dict:
    """Update access_scope metadata for all vectors from a source document.

    Args:
        request: UpdateScopeRequest with source_id and new access_scope.

    Returns:
        Dict with updated_count and optional message.

    Raises:
        HTTPException: 503 if Pinecone is not configured.
    """
    pinecone = _get_pinecone()
    if pinecone is None:
        raise HTTPException(status_code=503, detail="Vector DB not configured")

    # Query for vectors with this source_id
    try:
        results = await pinecone.query_by_filter(
            filter_dict={"source_id": {"$eq": request.source_id}},
            top_k=10000,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to query vector DB: {str(e)}"
        )

    if not results:
        return {"updated_count": 0, "message": "No vectors found for source_id"}

    # Update metadata for each vector
    updated_count = 0
    for match in results:
        try:
            await pinecone.update_metadata(
                id=match["id"],
                metadata={"access_scope": request.access_scope},
            )
            updated_count += 1
        except Exception as e:
            # Log but continue - partial success is still useful
            print(f"Failed to update vector {match['id']}: {e}")

    return {
        "updated_count": updated_count,
        "message": f"Updated {updated_count} of {len(results)} vectors",
    }
