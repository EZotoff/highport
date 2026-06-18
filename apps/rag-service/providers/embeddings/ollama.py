"""Ollama embeddings provider implementation for local free-tier inference."""

import os
from importlib import import_module
from typing import Protocol, cast

from .base import EmbeddingsProvider


class _OllamaAsyncClient(Protocol):
    async def embed(
        self, model: str, input: str | list[str]
    ) -> dict[str, list[list[float]]]: ...


class _OllamaAsyncClientFactory(Protocol):
    def __call__(self, *, host: str) -> _OllamaAsyncClient: ...


class OllamaEmbeddingsProvider(EmbeddingsProvider):
    """Ollama embeddings provider for local embedding generation.

    Uses the ollama Python SDK to interact with a locally running Ollama server.
    No API key required — fully free and open source.
    """

    DEFAULT_DIMENSION: int = 1024

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
    ):
        """Initialize the Ollama embeddings provider.

        Args:
            base_url: Ollama server URL. Defaults to OLLAMA_BASE_URL env var
                or http://localhost:11434.
            model: The model to use. Defaults to OLLAMA_EMBED_MODEL env var
                or qwen3-embedding:0.6b.
        """
        self.base_url: str = base_url or os.environ.get(
            "OLLAMA_BASE_URL", "http://localhost:11434"
        )
        self.model: str = model or os.environ.get(
            "OLLAMA_EMBED_MODEL", "qwen3-embedding:0.6b"
        )
        self._dimension: int = int(
            os.environ.get("EMBEDDING_DIM", str(self.DEFAULT_DIMENSION))
        )
        self._client: _OllamaAsyncClient | None = None

    @property
    def dimension(self) -> int:
        """Return the embedding dimension produced by this provider."""
        return self._dimension

    def _ensure_client(self) -> None:
        """Lazily initialize the Ollama async client."""
        if self._client is None:
            if not self.base_url:
                raise ValueError(
                    "OLLAMA_BASE_URL not set. Provide base_url or set environment variable."
                )
            ollama_module = import_module("ollama")
            async_client = cast(
                _OllamaAsyncClientFactory,
                getattr(ollama_module, "AsyncClient"),
            )
            self._client = async_client(host=self.base_url)

    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        self._ensure_client()
        if self._client is None:
            raise RuntimeError("Ollama client not initialized")
        result = await self._client.embed(model=self.model, input=text)
        return result["embeddings"][0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            A list of embedding vectors.
        """
        self._ensure_client()
        if self._client is None:
            raise RuntimeError("Ollama client not initialized")
        result = await self._client.embed(model=self.model, input=texts)
        return result["embeddings"]
