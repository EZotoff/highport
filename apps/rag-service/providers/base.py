"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncGenerator


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    Provides a consistent interface for text generation across
    different LLM backends (Gemini, OpenAI, etc.).
    """

    @abstractmethod
    async def generate(self, prompt: str) -> str:
        """Generate text from a prompt.

        Args:
            prompt: The input prompt for text generation.

        Returns:
            The generated text response.
        """
        pass

    @abstractmethod
    async def generate_with_context(self, prompt: str, context: list[str]) -> str:
        """Generate text with additional context documents.

        Args:
            prompt: The input prompt for text generation.
            context: List of context documents to include.

        Returns:
            The generated text response.
        """
        pass

    @abstractmethod
    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream generated text from a prompt.

        Args:
            prompt: The input prompt for text generation.

        Yields:
            Chunks of generated text.
        """
        if False:
            yield ""
        raise NotImplementedError

    @abstractmethod
    async def stream_with_context(
        self, prompt: str, context: list[str]
    ) -> AsyncGenerator[str, None]:
        """Stream generated text with additional context documents.

        Args:
            prompt: The input prompt for text generation.
            context: List of context documents to include.

        Yields:
            Chunks of generated text.
        """
        if False:
            yield ""
        raise NotImplementedError
