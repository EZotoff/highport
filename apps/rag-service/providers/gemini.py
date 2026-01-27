"""Google Gemini LLM provider implementation."""

import os
from typing import Optional

from providers.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider.

    Uses the google-generativeai SDK to interact with Gemini models.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-pro"):
        """Initialize the Gemini provider.

        Args:
            api_key: Google AI API key. If not provided, reads from
                GEMINI_API_KEY environment variable.
            model: The Gemini model to use. Defaults to "gemini-pro".
        """
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = model
        self._client = None
        self._model = None

    def _ensure_client(self):
        """Lazily initialize the Gemini client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "GEMINI_API_KEY not set. Provide api_key or set environment variable."
                )
            import google.generativeai as genai

            genai.configure(api_key=self.api_key)
            self._client = genai
            self._model = genai.GenerativeModel(self.model_name)

    async def generate(self, prompt: str) -> str:
        """Generate text from a prompt using Gemini.

        Args:
            prompt: The input prompt for text generation.

        Returns:
            The generated text response.
        """
        self._ensure_client()
        response = await self._model.generate_content_async(prompt)
        return response.text

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
