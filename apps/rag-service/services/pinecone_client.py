"""Pinecone vector database client wrapper."""

import os
from typing import Optional, Any
from dataclasses import dataclass


@dataclass
class QueryResult:
    """Result from a Pinecone query."""

    id: str
    score: float
    metadata: dict


class PineconeService:
    """Wrapper for Pinecone vector database operations.

    Provides a simplified interface for upserting and querying vectors.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        index_name: Optional[str] = None,
        environment: Optional[str] = None,
    ):
        """Initialize the Pinecone service.

        Args:
            api_key: Pinecone API key. If not provided, reads from
                PINECONE_API_KEY environment variable.
            index_name: Name of the Pinecone index. If not provided, reads from
                PINECONE_INDEX_NAME environment variable.
            environment: Pinecone environment. If not provided, reads from
                PINECONE_ENVIRONMENT environment variable.
        """
        self.api_key = api_key or os.environ.get("PINECONE_API_KEY")
        self.index_name = index_name or os.environ.get("PINECONE_INDEX_NAME")
        self.environment = environment or os.environ.get("PINECONE_ENVIRONMENT")
        self._index: Any | None = None

    def _ensure_index(self):
        """Lazily initialize the Pinecone index."""
        if self._index is None:
            if not self.api_key:
                raise ValueError(
                    "PINECONE_API_KEY not set. Provide api_key or set environment variable."
                )
            if not self.index_name:
                raise ValueError(
                    "PINECONE_INDEX_NAME not set. Provide index_name or set environment variable."
                )
            from pinecone import Pinecone  # type: ignore[import-untyped]

            pc = Pinecone(api_key=self.api_key)
            self._index = pc.Index(self.index_name)

    async def upsert(
        self,
        id: str,
        vector: list[float],
        metadata: Optional[dict] = None,
        namespace: str = "",
    ) -> None:
        """Upsert a vector into Pinecone.

        Args:
            id: Unique identifier for the vector.
            vector: The embedding vector.
            metadata: Optional metadata to store with the vector.
            namespace: Optional namespace for organization.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        index.upsert(
            vectors=[{"id": id, "values": vector, "metadata": metadata or {}}],
            namespace=namespace,
        )

    async def upsert_batch(self, vectors: list[dict], namespace: str = "") -> None:
        """Upsert multiple vectors into Pinecone.

        Args:
            vectors: List of dicts with 'id', 'values', and optional 'metadata'.
            namespace: Optional namespace for organization.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        index.upsert(vectors=vectors, namespace=namespace)

    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        namespace: str = "",
        include_metadata: bool = True,
        filter: Optional[dict] = None,
    ) -> list[QueryResult]:
        """Query Pinecone for similar vectors.

        Args:
            vector: The query embedding vector.
            top_k: Number of results to return.
            namespace: Optional namespace to query.
            include_metadata: Whether to include metadata in results.
            filter: Optional metadata filter.

        Returns:
            List of QueryResult objects with id, score, and metadata.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        results = index.query(
            vector=vector,
            top_k=top_k,
            namespace=namespace,
            include_metadata=include_metadata,
            filter=filter,
        )
        return [
            QueryResult(
                id=match["id"], score=match["score"], metadata=match.get("metadata", {})
            )
            for match in results.get("matches", [])
        ]

    async def delete(self, ids: list[str], namespace: str = "") -> None:
        """Delete vectors by ID.

        Args:
            ids: List of vector IDs to delete.
            namespace: Optional namespace.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        index.delete(ids=ids, namespace=namespace)

    async def query_by_filter(
        self, filter_dict: dict, top_k: int = 10000, namespace: str = ""
    ) -> list[dict]:
        """Query Pinecone with a metadata filter.

        Args:
            filter_dict: Pinecone metadata filter dictionary.
            top_k: Maximum number of results to return.
            namespace: Optional namespace to query.

        Returns:
            List of matching vectors with id and metadata.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        # Use a zero vector since we're filtering, not doing similarity search
        zero_vector = [0.0] * 1536  # Standard OpenAI embedding dimension
        results = index.query(
            vector=zero_vector,
            top_k=top_k,
            namespace=namespace,
            filter=filter_dict,
            include_metadata=True,
        )
        return [
            {"id": match["id"], "metadata": match.get("metadata", {})}
            for match in results.get("matches", [])
        ]

    async def update_metadata(
        self, id: str, metadata: dict, namespace: str = ""
    ) -> None:
        """Update metadata for a specific vector.

        Args:
            id: The vector ID to update.
            metadata: The metadata fields to update (merged with existing).
            namespace: Optional namespace.
        """
        self._ensure_index()
        index = self._index
        if index is None:
            raise RuntimeError("Pinecone index not initialized")
        index.update(id=id, set_metadata=metadata, namespace=namespace)
