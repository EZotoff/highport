"""Embeddings provider factory.

Supports:
- ollama: Local Ollama embeddings (free, requires Ollama running)
- openai: OpenAI embeddings (requires OPENAI_API_KEY)

Backward compatibility:
Existing callers import ``EmbeddingsClient`` and ``EMBEDDING_DIM`` from this
module. Those names are intentionally re-exported as a shim until callers move
to ``get_embeddings_provider()`` and ``get_embedding_dimension()``.
"""

import os

from .base import EmbeddingsProvider
from .openai import OpenAIEmbeddingsProvider


def get_embeddings_provider() -> EmbeddingsProvider:
    """Create an embeddings provider based on EMBEDDINGS_PROVIDER environment variable.

    Returns:
        An EmbeddingsProvider instance.

    Raises:
        ValueError: If an unknown provider is specified.
    """
    provider = os.environ.get("EMBEDDINGS_PROVIDER", "ollama").lower()

    if provider == "ollama":
        from .ollama import OllamaEmbeddingsProvider

        return OllamaEmbeddingsProvider()
    elif provider == "openai":
        return OpenAIEmbeddingsProvider()
    else:
        raise ValueError(
            f"Unknown embeddings provider: '{provider}'. Supported providers: "
            f"'ollama', 'openai'"
        )


def get_embedding_dimension() -> int:
    """Return the configured embedding dimension.

    EMBEDDING_DIM takes precedence when set to a positive integer. Otherwise,
    the dimension is derived from the configured embeddings provider.
    """
    dimension = os.environ.get("EMBEDDING_DIM")
    if dimension is not None:
        parsed_dimension = int(dimension)
        if parsed_dimension > 0:
            return parsed_dimension
    return get_embeddings_provider().dimension


EmbeddingsClient = OpenAIEmbeddingsProvider
EMBEDDING_DIM = 1536


__all__ = [
    "EMBEDDING_DIM",
    "EmbeddingsClient",
    "EmbeddingsProvider",
    "OpenAIEmbeddingsProvider",
    "get_embedding_dimension",
    "get_embeddings_provider",
]
