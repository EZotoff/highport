"""Abstract base class for vector database providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class VectorQueryResult:
    """Result from a vector database query."""

    id: str
    score: float
    metadata: dict


class VectorDBProvider(ABC):
    """Abstract base class for vector database providers.

    Provides a consistent interface for vector storage and retrieval
    across different backends (Pinecone, Chroma, etc.).
    """

    @abstractmethod
    async def upsert(
        self,
        id: str,
        vector: list[float],
        metadata: Optional[dict] = None,
        namespace: str = "",
    ) -> None:
        """Upsert a single vector.

        Args:
            id: Unique identifier for the vector.
            vector: The embedding vector.
            metadata: Optional metadata to store with the vector.
            namespace: Optional namespace for organization.
        """
        pass

    @abstractmethod
    async def upsert_batch(self, vectors: list[dict], namespace: str = "") -> None:
        """Upsert multiple vectors.

        Args:
            vectors: List of dicts with 'id', 'values', and optional 'metadata'.
            namespace: Optional namespace for organization.
        """
        pass

    @abstractmethod
    async def query(
        self,
        vector: list[float],
        top_k: int = 5,
        namespace: str = "",
        include_metadata: bool = True,
        filter: Optional[dict] = None,
    ) -> list[VectorQueryResult]:
        """Query for similar vectors.

        Args:
            vector: The query embedding vector.
            top_k: Number of results to return.
            namespace: Optional namespace to query.
            include_metadata: Whether to include metadata in results.
            filter: Optional metadata filter.

        Returns:
            List of VectorQueryResult objects with id, score, and metadata.
        """
        pass

    @abstractmethod
    async def delete(self, ids: list[str], namespace: str = "") -> None:
        """Delete vectors by ID.

        Args:
            ids: List of vector IDs to delete.
            namespace: Optional namespace.
        """
        pass

    @abstractmethod
    async def query_by_filter(
        self, filter_dict: dict, top_k: int = 10000, namespace: str = ""
    ) -> list[dict]:
        """Query with a metadata filter (no similarity search).

        Args:
            filter_dict: Metadata filter dictionary.
            top_k: Maximum number of results to return.
            namespace: Optional namespace to query.

        Returns:
            List of matching vectors with id and metadata.
        """
        pass

    @abstractmethod
    async def update_metadata(
        self, id: str, metadata: dict, namespace: str = ""
    ) -> None:
        """Update metadata for a specific vector.

        Args:
            id: The vector ID to update.
            metadata: The metadata fields to update (merged with existing).
            namespace: Optional namespace.
        """
        pass
