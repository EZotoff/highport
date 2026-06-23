"""Ollama LLM provider implementation for local free-tier inference."""

import os
from typing import AsyncGenerator

from providers.llm.base import LLMProvider


class OllamaProvider(LLMProvider):
    """Ollama LLM provider for local model inference.

    Uses the ollama Python SDK to interact with a locally running Ollama server.
    No API key required — fully free and open source.
    """

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
    ):
        """Initialize the Ollama provider.

        Args:
            base_url: Ollama server URL. Defaults to OLLAMA_BASE_URL env var
                or http://localhost:11434.
            model: The model to use. Defaults to OLLAMA_MODEL env var
                or llama3.2.
        """
        self.base_url = base_url or os.environ.get(
            "OLLAMA_BASE_URL", "http://localhost:11434"
        )
        self.model = model or os.environ.get("OLLAMA_MODEL", "llama3.2")
        self._client = None

    def _ensure_client(self):
        """Lazily initialize the Ollama async client."""
        if self._client is None:
            import ollama

            self._client = ollama.AsyncClient(host=self.base_url)

    async def generate(self, prompt: str) -> str:
        """Generate text from a prompt using Ollama.

        Args:
            prompt: The input prompt for text generation.

        Returns:
            The generated text response.

        Raises:
            ConnectionError: If Ollama server is not reachable.
        """
        self._ensure_client()
        try:
            response = await self._client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                think=False,
            )
            return response.message.content
        except Exception as e:
            _raise_if_connection_error(e, self.base_url)
            raise

    async def generate_with_context(self, prompt: str, context: list[str]) -> str:
        """Generate text with additional context documents.

        Args:
            prompt: The input prompt for text generation.
            context: List of context documents to include.

        Returns:
            The generated text response.
        """
        context_text = "\n\n---\n\n".join(context)
        full_prompt = f"""Based on the following context documents:

{context_text}

---

User query: {prompt}

Please provide a helpful response based on the context above."""

        return await self.generate(full_prompt)

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream generated text from a prompt using Ollama.

        Args:
            prompt: The input prompt for text generation.

        Yields:
            Chunks of generated text.
        """
        self._ensure_client()
        try:
            response = await self._client.chat(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                stream=True,
            )
            async for chunk in response:
                content = chunk.message.content
                if content:
                    yield content
        except Exception as e:
            _raise_if_connection_error(e, self.base_url)
            raise

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
        context_text = "\n\n---\n\n".join(context)
        full_prompt = f"""Based on the following context documents:

{context_text}

---

User query: {prompt}

Please provide a helpful response based on the context above."""

        async for chunk in self.stream(full_prompt):
            yield chunk


class OllamaConnectionError(ConnectionError):
    """Raised when Ollama server is not reachable."""

    pass


def _raise_if_connection_error(exc: Exception, base_url: str) -> None:
    """Re-raise as OllamaConnectionError if the error is a connection issue."""
    error_str = str(exc).lower()
    connection_indicators = ["connect", "refused", "timeout", "unreachable"]
    if any(indicator in error_str for indicator in connection_indicators):
        raise OllamaConnectionError(
            f"Ollama is not available at {base_url}. "
            f"Please ensure Ollama is running: "
            f"1) Install from https://ollama.com "
            f"2) Start with 'ollama serve' "
            f"3) Pull a model with 'ollama pull llama3.2'"
        ) from exc
