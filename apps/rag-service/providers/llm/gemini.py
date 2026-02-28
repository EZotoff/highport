"""Google Gemini LLM provider implementation."""

import os
from typing import Any, Optional, AsyncGenerator, cast

import httpx
import google.generativeai as genai

from providers.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider.

    Uses the google-generativeai SDK to interact with Gemini models.
    """

    def __init__(
        self, api_key: Optional[str] = None, model: str = "models/gemini-2.0-flash"
    ):
        """Initialize the Gemini provider.

        Args:
            api_key: Google AI API key. If not provided, reads from
                GEMINI_API_KEY environment variable.
            model: The Gemini model to use. Defaults to "gemini-2.0-flash".
        """
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.model_name = model
        self._client: Any = None
        self._model: Any = None
        self._image_model = os.environ.get(
            "GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image"
        )

    def _ensure_client(self):
        """Lazily initialize the Gemini client."""
        if self._client is None:
            if not self.api_key:
                raise ValueError(
                    "GEMINI_API_KEY not set. Provide api_key or set environment variable."
                )
            genai_any = cast(Any, genai)
            genai_any.configure(api_key=self.api_key)
            self._client = genai_any
            self._model = genai_any.GenerativeModel(self.model_name)

    async def generate(self, prompt: str) -> str:
        """Generate text from a prompt using Gemini.

        Args:
            prompt: The input prompt for text generation.

        Returns:
            The generated text response.
        """
        self._ensure_client()
        if self._model is None:
            raise RuntimeError("Gemini model not initialized")
        model = cast(Any, self._model)
        response = await model.generate_content_async(prompt)
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

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream generated text from a prompt using Gemini.

        Args:
            prompt: The input prompt for text generation.

        Yields:
            Chunks of generated text.
        """
        self._ensure_client()
        if self._model is None:
            raise RuntimeError("Gemini model not initialized")
        model = cast(Any, self._model)
        response = await model.generate_content_async(prompt, stream=True)
        async for chunk in response:
            yield chunk.text

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

    async def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> tuple[str, str, str]:
        """Generate an image from a text prompt.

        Args:
            prompt: The input prompt for image generation.
            aspect_ratio: Image aspect ratio string (e.g., "1:1").

        Returns:
            Tuple of (image_base64, mime_type, model_id).
        """
        api_key = self.api_key or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not set. Provide api_key or set environment variable."
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._image_model}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {"aspectRatio": aspect_ratio},
            },
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        response.raise_for_status()
        image_data, mime_type = _extract_inline_image(response.json())
        return image_data, mime_type, self._image_model

    async def generate_image_from_reference(
        self,
        prompt: str,
        reference_image_base64: str,
        reference_image_mime_type: str,
        aspect_ratio: str = "1:1",
    ) -> tuple[str, str, str]:
        """Generate an image from a reference image and text prompt.

        Args:
            prompt: The input prompt for image editing.
            reference_image_base64: Base64-encoded reference image data.
            reference_image_mime_type: Mime type of the reference image.
            aspect_ratio: Image aspect ratio string.

        Returns:
            Tuple of (image_base64, mime_type, model_id).
        """
        api_key = self.api_key or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not set. Provide api_key or set environment variable."
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self._image_model}:generateContent"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": reference_image_mime_type,
                                "data": reference_image_base64,
                            }
                        },
                        {"text": prompt},
                    ]
                }
            ],
            "generationConfig": {
                "responseModalities": ["IMAGE"],
                "imageConfig": {"aspectRatio": aspect_ratio},
            },
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
                json=payload,
            )
        response.raise_for_status()
        image_data, mime_type = _extract_inline_image(response.json())
        return image_data, mime_type, self._image_model


def _extract_inline_image(response_json: dict[str, Any]) -> tuple[str, str]:
    candidates = response_json.get("candidates", [])
    for candidate in candidates:
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        for part in parts:
            inline_data = part.get("inlineData") or part.get("inline_data")
            if inline_data:
                mime_type = inline_data.get("mimeType") or inline_data.get("mime_type")
                data = inline_data.get("data")
                if data and mime_type:
                    return data, mime_type
    raise RuntimeError("No image data found in Gemini response")
