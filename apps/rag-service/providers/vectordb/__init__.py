"""Vector database provider factory.

Supports:
- pinecone: Pinecone cloud vector DB (requires PINECONE_API_KEY)
- chroma: Local ChromaDB (free, no API key needed)
"""

import os

from .base import VectorDBProvider, VectorQueryResult


def get_vectordb_provider() -> VectorDBProvider:
    """Create a vector DB provider based on VECTORDB_PROVIDER environment variable.

    Returns:
        A VectorDBProvider instance.

    Raises:
        ValueError: If an unknown provider is specified.
    """
    provider = os.environ.get("VECTORDB_PROVIDER", "chroma").lower()

    if provider == "pinecone":
        from .pinecone_provider import PineconeProvider

        return PineconeProvider()
    elif provider == "chroma":
        from .chroma_provider import ChromaProvider

        return ChromaProvider()
    else:
        raise ValueError(
            f"Unknown vector DB provider: '{provider}'. "
            f"Supported providers: 'pinecone', 'chroma'"
        )


def get_vectordb_provider_name() -> str:
    """Return the name of the configured vector DB provider."""
    return os.environ.get("VECTORDB_PROVIDER", "chroma").lower()


__all__ = [
    "VectorDBProvider",
    "VectorQueryResult",
    "get_vectordb_provider",
    "get_vectordb_provider_name",
]
