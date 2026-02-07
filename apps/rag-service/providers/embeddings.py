"""OpenAI embeddings client for vector generation."""

import os
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from openai import AsyncOpenAI


class EmbeddingsClient:
    """OpenAI embeddings client for generating text embeddings.

    Uses the OpenAI API to generate embeddings for text documents.
    Default model is text-embedding-ada-002 which produces 1536-dim vectors.
    """

    EMBEDDING_DIM = 1536  # text-embedding-ada-002 dimension

    def __init__(
        self, api_key: Optional[str] = None, model: str = "text-embedding-ada-002"
    ):
        """Initialize the embeddings client.

        Args:
            api_key: OpenAI API key. If not provided, reads from
                OPENAI_API_KEY environment variable.
            model: The embedding model to use. Defaults to text-embedding-ada-002.
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self._client: "AsyncOpenAI | None" = None

    def _ensure_client(self):
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
