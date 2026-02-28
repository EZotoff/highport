"""LLM provider factory.

Supports:
- gemini: Google Gemini (requires GEMINI_API_KEY)
- ollama: Local Ollama (free, requires Ollama running)
"""

import os

from .base import LLMProvider


def get_llm_provider() -> LLMProvider:
    """Create an LLM provider based on LLM_PROVIDER environment variable.

    Returns:
        An LLMProvider instance.

    Raises:
        ValueError: If an unknown provider is specified.
    """
    provider = os.environ.get("LLM_PROVIDER", "ollama").lower()

    if provider == "gemini":
        from .gemini import GeminiProvider

        return GeminiProvider()
    elif provider == "ollama":
        from .ollama import OllamaProvider

        return OllamaProvider()
    else:
        raise ValueError(
            f"Unknown LLM provider: '{provider}'. "
            f"Supported providers: 'gemini', 'ollama'"
        )


def get_llm_provider_name() -> str:
    """Return the name of the configured LLM provider."""
    return os.environ.get("LLM_PROVIDER", "ollama").lower()


__all__ = ["LLMProvider", "get_llm_provider", "get_llm_provider_name"]
