import importlib

import pytest


embeddings_module = importlib.import_module("providers.embeddings")
base_module = importlib.import_module("providers.embeddings.base")
ollama_module = importlib.import_module("providers.embeddings.ollama")
openai_module = importlib.import_module("providers.embeddings.openai")

EmbeddingsProvider = getattr(base_module, "EmbeddingsProvider")
OllamaEmbeddingsProvider = getattr(ollama_module, "OllamaEmbeddingsProvider")
OpenAIEmbeddingsProvider = getattr(openai_module, "OpenAIEmbeddingsProvider")
get_embedding_dimension = getattr(embeddings_module, "get_embedding_dimension")
get_embeddings_provider = getattr(embeddings_module, "get_embeddings_provider")


def test_factory_defaults_to_ollama(monkeypatch):
    monkeypatch.delenv("EMBEDDINGS_PROVIDER", raising=False)

    provider = get_embeddings_provider()

    assert isinstance(provider, OllamaEmbeddingsProvider)


def test_factory_returns_openai_when_explicit(monkeypatch):
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "openai")

    provider = get_embeddings_provider()

    assert isinstance(provider, OpenAIEmbeddingsProvider)


def test_factory_raises_on_unknown_provider(monkeypatch):
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "bogus")

    with pytest.raises(ValueError):
        get_embeddings_provider()


def test_ollama_provider_dimension_defaults_to_1024(monkeypatch):
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)

    assert OllamaEmbeddingsProvider().dimension == 1024


def test_openai_provider_dimension_defaults_to_1536(monkeypatch):
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)

    assert OpenAIEmbeddingsProvider().dimension == 1536


def test_dimension_override_via_env(monkeypatch):
    monkeypatch.setenv("EMBEDDINGS_PROVIDER", "ollama")
    monkeypatch.setenv("EMBEDDING_DIM", "768")

    assert get_embedding_dimension() == 768


def test_get_embedding_dimension_derives_from_provider_when_no_override(monkeypatch):
    monkeypatch.delenv("EMBEDDING_DIM", raising=False)
    monkeypatch.delenv("EMBEDDINGS_PROVIDER", raising=False)

    assert get_embedding_dimension() == get_embeddings_provider().dimension


def test_ollama_provider_reads_env_vars(monkeypatch):
    monkeypatch.setenv("OLLAMA_EMBED_MODEL", "foo")

    assert OllamaEmbeddingsProvider().model_name == "foo"


def test_openai_provider_reads_env_vars(monkeypatch):
    monkeypatch.setenv("OPENAI_EMBEDDING_MODEL", "bar")

    assert OpenAIEmbeddingsProvider().model_name == "bar"


def test_abc_contract():
    assert isinstance(OllamaEmbeddingsProvider(), EmbeddingsProvider)
    assert isinstance(OpenAIEmbeddingsProvider(), EmbeddingsProvider)
