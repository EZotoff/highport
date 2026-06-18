import hashlib


class MockEmbeddings:
    """Mock embeddings client that returns deterministic vectors without API calls."""

    def __init__(self, dim: int = 1024):
        self.dim = dim
        self.model = "mock-embedding"
        self.call_history: list[dict] = []

    @property
    def dimension(self) -> int:
        return self.dim

    @property
    def model_name(self) -> str:
        return self.model

    def _deterministic_vector(self, text: str) -> list[float]:
        """Generate a deterministic vector based on text hash."""
        hash_bytes = hashlib.sha256(text.encode()).digest()
        vector = []
        for i in range(self.dim):
            byte_idx = i % len(hash_bytes)
            value = (hash_bytes[byte_idx] + i) / 255.0
            vector.append(value - 0.5)  # Normalize to [-0.5, 0.5]
        return vector

    async def embed(self, text: str) -> list[float]:
        self.call_history.append({"method": "embed", "text": text})
        return self._deterministic_vector(text)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        self.call_history.append({"method": "embed_batch", "texts": texts})
        return [self._deterministic_vector(text) for text in texts]
