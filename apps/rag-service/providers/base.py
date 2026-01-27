"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod


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
