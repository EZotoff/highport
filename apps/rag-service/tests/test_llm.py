import pytest

from mocks.mock_gemini import MockGeminiProvider


@pytest.mark.asyncio
async def test_generate_returns_string(llm_provider):
    result = await llm_provider.generate("Hello")
    assert isinstance(result, str)
    assert len(result) > 0


@pytest.mark.asyncio
async def test_generate_uses_canned_response(llm_provider):
    result = await llm_provider.generate("Hello")
    assert result == "Hello! How can I help you today?"


@pytest.mark.asyncio
async def test_generate_falls_back_to_default():
    provider = MockGeminiProvider()
    result = await provider.generate("Unknown prompt")
    assert result == "This is a mocked response from MockGeminiProvider."


@pytest.mark.asyncio
async def test_generate_with_context_returns_string(llm_provider):
    result = await llm_provider.generate_with_context(
        prompt="What is X?", context=["Document 1", "Document 2"]
    )
    assert isinstance(result, str)
    assert "What is X?" in result


@pytest.mark.asyncio
async def test_call_history_tracks_calls(llm_provider):
    await llm_provider.generate("Test prompt")
    assert len(llm_provider.call_history) == 1
    assert llm_provider.call_history[0]["method"] == "generate"
    assert llm_provider.call_history[0]["prompt"] == "Test prompt"
