"""Unit tests for concrete embeddings providers with mocked SDK clients."""

from collections.abc import Callable
from dataclasses import dataclass
import importlib
from types import ModuleType
from typing import Protocol, cast
from unittest.mock import AsyncMock, patch

import pytest


class EmbeddingsProviderUnderTest(Protocol):
    @property
    def dimension(self) -> int: ...

    @property
    def model_name(self) -> str: ...

    async def embed(self, text: str) -> list[float]: ...

    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...


class OllamaProviderUnderTest(EmbeddingsProviderUnderTest, Protocol):
    base_url: str


embeddings_module = importlib.import_module("providers.embeddings")
ollama_module = importlib.import_module("providers.embeddings.ollama")
openai_module = importlib.import_module("providers.embeddings.openai")

OllamaEmbeddingsProvider = cast(
    Callable[..., OllamaProviderUnderTest],
    getattr(ollama_module, "OllamaEmbeddingsProvider"),
)
OpenAIEmbeddingsProvider = cast(
    Callable[..., EmbeddingsProviderUnderTest],
    getattr(openai_module, "OpenAIEmbeddingsProvider"),
)
get_embedding_dimension = cast(
    Callable[[], int],
    getattr(embeddings_module, "get_embedding_dimension"),
)


class FakeOllamaClient:
    """Minimal AsyncClient test double backed by AsyncMock."""

    def __init__(self, response: dict[str, list[list[float]]]) -> None:
        self.embed: AsyncMock = AsyncMock(return_value=response)


class FakeOllamaAsyncClientFactory:
    """Callable test double for ollama.AsyncClient."""

    def __init__(self, client: FakeOllamaClient) -> None:
        self.client: FakeOllamaClient = client
        self.hosts: list[str] = []

    def __call__(self, *, host: str) -> FakeOllamaClient:
        self.hosts.append(host)
        return self.client


@dataclass
class FakeOpenAIEmbeddingData:
    embedding: list[float]


@dataclass
class FakeOpenAIEmbeddingResponse:
    data: list[FakeOpenAIEmbeddingData]


class FakeOpenAIEmbeddingsEndpoint:
    """Minimal embeddings endpoint test double backed by AsyncMock."""

    def __init__(self, response: FakeOpenAIEmbeddingResponse) -> None:
        self.create: AsyncMock = AsyncMock(return_value=response)


class FakeOpenAIClient:
    """Minimal AsyncOpenAI client test double."""

    def __init__(self, response: FakeOpenAIEmbeddingResponse) -> None:
        self.embeddings: FakeOpenAIEmbeddingsEndpoint = FakeOpenAIEmbeddingsEndpoint(
            response
        )


class FakeAsyncOpenAIFactory:
    """Callable test double for openai.AsyncOpenAI."""

    def __init__(self, client: FakeOpenAIClient) -> None:
        self.client: FakeOpenAIClient = client
        self.api_keys: list[str] = []

    def __call__(self, *, api_key: str) -> FakeOpenAIClient:
        self.api_keys.append(api_key)
        return self.client


def _openai_response(vectors: list[list[float]]) -> FakeOpenAIEmbeddingResponse:
    return FakeOpenAIEmbeddingResponse(
        data=[FakeOpenAIEmbeddingData(embedding=vector) for vector in vectors]
    )


def _fake_ollama_module(factory: Callable[..., FakeOllamaClient]) -> ModuleType:
    module = ModuleType("ollama")
    setattr(module, "AsyncClient", factory)
    return module


def _fake_openai_module(factory: Callable[..., FakeOpenAIClient]) -> ModuleType:
    module = ModuleType("openai")
    setattr(module, "AsyncOpenAI", factory)
    return module


def _set_lazy_client(provider: EmbeddingsProviderUnderTest, client: object) -> None:
    provider_state = cast(dict[str, object | None], vars(provider))
    provider_state["_client"] = client


def _lazy_client(provider: EmbeddingsProviderUnderTest) -> object | None:
    provider_state = cast(dict[str, object | None], vars(provider))
    return provider_state.get("_client")


@pytest.mark.asyncio
async def test_ollama_embed_returns_first_vector(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed(text) returns the first vector from the embeddings response."""
    monkeypatch.delenv("OLLAMA_EMBED_MODEL", raising=False)
    mock_client = FakeOllamaClient({"embeddings": [[0.1, 0.2, 0.3]]})

    provider = OllamaEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)

    result = await provider.embed("test text")

    assert result == [0.1, 0.2, 0.3]


@pytest.mark.asyncio
async def test_ollama_embed_passes_correct_model_and_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed(text) calls client.embed with model and scalar input."""
    monkeypatch.delenv("OLLAMA_EMBED_MODEL", raising=False)
    mock_client = FakeOllamaClient({"embeddings": [[0.1, 0.2, 0.3]]})

    provider = OllamaEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    _ = await provider.embed("test text")

    mock_client.embed.assert_awaited_once_with(
        model="qwen3-embedding:0.6b", input="test text"
    )


@pytest.mark.asyncio
async def test_ollama_embed_batch_returns_all_vectors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed_batch(texts) returns every vector from the embeddings response."""
    monkeypatch.delenv("OLLAMA_EMBED_MODEL", raising=False)
    vectors = [[0.1, 0.2], [0.3, 0.4]]
    mock_client = FakeOllamaClient({"embeddings": vectors})

    provider = OllamaEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    result = await provider.embed_batch(["first", "second"])

    assert result == vectors


@pytest.mark.asyncio
async def test_ollama_embed_batch_passes_input_as_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed_batch(texts) sends the original list as input."""
    monkeypatch.delenv("OLLAMA_EMBED_MODEL", raising=False)
    mock_client = FakeOllamaClient({"embeddings": [[0.1], [0.2]]})

    provider = OllamaEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    _ = await provider.embed_batch(["first", "second"])

    mock_client.embed.assert_awaited_once_with(
        model="qwen3-embedding:0.6b", input=["first", "second"]
    )


@pytest.mark.asyncio
async def test_ollama_lazy_client_initialized_on_first_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The Ollama SDK client is created lazily on the first embed call."""
    monkeypatch.delenv("OLLAMA_EMBED_MODEL", raising=False)
    monkeypatch.delenv("OLLAMA_BASE_URL", raising=False)
    mock_client = FakeOllamaClient({"embeddings": [[0.1]]})
    async_client_factory = FakeOllamaAsyncClientFactory(mock_client)
    fake_module = _fake_ollama_module(async_client_factory)

    provider = OllamaEmbeddingsProvider()
    assert _lazy_client(provider) is None

    with patch("providers.embeddings.ollama.import_module", return_value=fake_module):
        result = await provider.embed("test text")

    assert async_client_factory.hosts == ["http://localhost:11434"]
    assert _lazy_client(provider) is mock_client
    assert result == [0.1]


def test_ollama_reads_base_url_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://ollama.example:11434")

    provider = OllamaEmbeddingsProvider()

    assert provider.base_url == "http://ollama.example:11434"


def test_ollama_dimension_defaults_to_1024(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)

    assert OllamaEmbeddingsProvider().dimension == 1024


def test_ollama_model_name_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OLLAMA_EMBED_MODEL", "custom-model")

    assert OllamaEmbeddingsProvider().model_name == "custom-model"


def test_ollama_dimension_override_via_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_DIM", "768")

    assert OllamaEmbeddingsProvider().dimension == 768


@pytest.mark.asyncio
async def test_openai_embed_returns_first_vector(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed(text) returns data[0].embedding from the OpenAI response."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    mock_client = FakeOpenAIClient(_openai_response([[0.4, 0.5, 0.6]]))

    provider = OpenAIEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)

    result = await provider.embed("test text")

    assert result == [0.4, 0.5, 0.6]


@pytest.mark.asyncio
async def test_openai_embed_passes_correct_model_and_input(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed(text) calls embeddings.create with model and scalar input."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    mock_client = FakeOpenAIClient(_openai_response([[0.4, 0.5, 0.6]]))

    provider = OpenAIEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    _ = await provider.embed("test text")

    mock_client.embeddings.create.assert_awaited_once_with(
        input="test text", model="text-embedding-3-small"
    )


@pytest.mark.asyncio
async def test_openai_embed_batch_returns_all_vectors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed_batch(texts) returns every embedding from the OpenAI response."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    vectors = [[0.4, 0.5], [0.6, 0.7]]
    mock_client = FakeOpenAIClient(_openai_response(vectors))

    provider = OpenAIEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    result = await provider.embed_batch(["first", "second"])

    assert result == vectors


@pytest.mark.asyncio
async def test_openai_embed_batch_passes_input_as_list(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """embed_batch(texts) sends the original list as input."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    mock_client = FakeOpenAIClient(_openai_response([[0.4], [0.5]]))

    provider = OpenAIEmbeddingsProvider()
    _set_lazy_client(provider, mock_client)
    _ = await provider.embed_batch(["first", "second"])

    mock_client.embeddings.create.assert_awaited_once_with(
        input=["first", "second"], model="text-embedding-3-small"
    )


@pytest.mark.asyncio
async def test_openai_lazy_client_initialized_on_first_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The OpenAI SDK client is created lazily on the first embed call."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-dummy")
    monkeypatch.delenv("OPENAI_EMBEDDING_MODEL", raising=False)
    mock_client = FakeOpenAIClient(_openai_response([[0.4]]))
    async_openai_factory = FakeAsyncOpenAIFactory(mock_client)
    fake_module = _fake_openai_module(async_openai_factory)

    provider = OpenAIEmbeddingsProvider()
    assert _lazy_client(provider) is None

    with patch.dict("sys.modules", {"openai": fake_module}):
        result = await provider.embed("test text")

    assert async_openai_factory.api_keys == ["sk-test-dummy"]
    assert _lazy_client(provider) is mock_client
    assert result == [0.4]


@pytest.mark.asyncio
async def test_openai_raises_value_error_when_api_key_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    provider = OpenAIEmbeddingsProvider()

    with pytest.raises(ValueError, match="OPENAI_API_KEY not set"):
        _ = await provider.embed("test text")


def test_openai_dimension_defaults_to_1536(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)

    assert OpenAIEmbeddingsProvider().dimension == 1536


def test_openai_model_name_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")

    assert OpenAIEmbeddingsProvider().model_name == "text-embedding-3-large"


def test_get_embedding_dimension_uses_provider_dim_when_no_override(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "openai")
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)

    assert get_embedding_dimension() == 1536


def test_get_embedding_dimension_uses_env_override_when_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "openai")
    monkeypatch.setenv("EMBEDDING_DIM", "512")

    assert get_embedding_dimension() == 512
