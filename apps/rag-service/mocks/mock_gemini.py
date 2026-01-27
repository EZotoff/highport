from typing import AsyncGenerator
from providers.base import LLMProvider


class MockGeminiProvider(LLMProvider):
    """Mock Gemini provider for testing without API calls."""

    CANNED_RESPONSES = {
        "Hello": "Hello! How can I help you today?",
        "default": "This is a mocked response from MockGeminiProvider.",
    }

    def __init__(self, responses: dict | None = None):
        self.responses = responses or self.CANNED_RESPONSES
        self.call_history: list[dict] = []

    async def generate(self, prompt: str) -> str:
        self.call_history.append({"method": "generate", "prompt": prompt})
        return self.responses.get(prompt, self.responses["default"])

    async def generate_with_context(self, prompt: str, context: list[str]) -> str:
        self.call_history.append(
            {"method": "generate_with_context", "prompt": prompt, "context": context}
        )
        return f"Context-aware response for: {prompt}"

    async def stream(self, prompt: str) -> AsyncGenerator[str, None]:
        self.call_history.append({"method": "stream", "prompt": prompt})
        response = self.responses.get(prompt, self.responses["default"])
        for word in response.split():
            yield word + " "

    async def stream_with_context(
        self, prompt: str, context: list[str]
    ) -> AsyncGenerator[str, None]:
        self.call_history.append(
            {"method": "stream_with_context", "prompt": prompt, "context": context}
        )
        response = f"Context-aware response for: {prompt}"
        for word in response.split():
            yield word + " "
