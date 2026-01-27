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


# Dependency override for testing
_pinecone_override: PineconeUpdateProtocol | None = None


def set_scope_dependencies(pinecone: PineconeUpdateProtocol | None = None) -> None:
    """Set dependency overrides for testing.

    Args:
        pinecone: Pinecone service override with update capability.
    """
    global _pinecone_override
    _pinecone_override = pinecone


def clear_scope_dependencies() -> None:
    """Clear all dependency overrides."""
    global _pinecone_override
    _pinecone_override = None


def _get_pinecone() -> PineconeUpdateProtocol | None:
    """Get Pinecone service.

    Returns None if no override is set and Pinecone is not configured.
    """
    if _pinecone_override is not None:
        return _pinecone_override

    import os

    if not os.environ.get("PINECONE_API_KEY"):
        return None

    from services.pinecone_client import PineconeService

    return PineconeService()


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
        raise HTTPException(status_code=503, detail="Pinecone not configured")

    # Query for vectors with this source_id
    try:
        results = await pinecone.query_by_filter(
            filter_dict={"source_id": {"$eq": request.source_id}},
            top_k=10000,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to query Pinecone: {str(e)}"
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
