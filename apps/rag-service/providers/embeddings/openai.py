"""OpenAI embeddings provider implementation."""

import os
from typing import TYPE_CHECKING

from .base import EmbeddingsProvider

if TYPE_CHECKING:
    from openai import AsyncOpenAI


class OpenAIEmbeddingsProvider(EmbeddingsProvider):
    """OpenAI embeddings provider for generating text embeddings.

    Uses the OpenAI API to generate embeddings for text documents.
    """

    DEFAULT_DIMENSION: int = 3 * 512

    def __init__(
        self, api_key: str | None = None, model: str | None = None
    ):
        """Initialize the embeddings provider.

        Args:
            api_key: OpenAI API key. If not provided, reads from
                OPENAI_API_KEY environment variable.
            model: The embedding model to use. Defaults to
                OPENAI_EMBEDDING_MODEL env var or text-embedding-3-small.
        """
        self.api_key: str | None = api_key or os.environ.get("OPENAI_API_KEY")
        self.model: str = model or os.environ.get(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        )
        self._dimension: int = int(
            os.environ.get("EMBEDDING_DIM", str(self.DEFAULT_DIMENSION))
        )
        self._client: "AsyncOpenAI | None" = None

    @property
    def dimension(self) -> int:
        """Return the embedding dimension produced by this provider."""
        return self._dimension

    def _ensure_client(self) -> None:
        """Lazily initialize the OpenAI client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "OPENAI_API_KEY not set. Provide api_key or set environment variable."
                )
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=self.api_key)

    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        self._ensure_client()
        if self._client is None:
            raise RuntimeError("OpenAI client not initialized")
        response = await self._client.embeddings.create(input=text, model=self.model)
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            A list of embedding vectors.
        """
        self._ensure_client()
        if self._client is None:
            raise RuntimeError("OpenAI client not initialized")
        response = await self._client.embeddings.create(input=texts, model=self.model)
        return [item.embedding for item in response.data]
