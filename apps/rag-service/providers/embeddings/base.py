"""Abstract base class for embeddings providers."""

from abc import ABC, abstractmethod


class EmbeddingsProvider(ABC):
    """Abstract base class for embeddings providers.

    Provides a consistent interface for text embedding generation across
    different backends (OpenAI, Ollama, etc.).
    """

    model: str

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text.

        Args:
            text: The text to embed.

        Returns:
            A list of floats representing the embedding vector.
        """
        pass

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed.

        Returns:
            A list of embedding vectors.
        """
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the embedding dimension produced by this provider."""
        pass

    @property
    def model_name(self) -> str:
        """Return the configured embedding model name."""
        return self.model
