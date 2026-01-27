import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from main import app
from mocks.mock_gemini import MockGeminiProvider
from mocks.mock_embeddings import MockEmbeddings
from mocks.mock_pinecone import MockPineconeIndex
from routers.ingest import set_dependencies, clear_dependencies


@pytest.fixture
def llm_provider():
    return MockGeminiProvider()


@pytest.fixture
def embeddings():
    return MockEmbeddings()


@pytest.fixture
def pinecone_index():
    return MockPineconeIndex()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_entity_response():
    return {
        "default": '{"characters": ["Captain Zara"], "locations": ["Imperial Station"], "factions": ["Imperial Navy"]}'
    }


@pytest.fixture
def entity_llm(mock_entity_response):
    return MockGeminiProvider(responses=mock_entity_response)


@pytest_asyncio.fixture
async def ingest_client(embeddings, entity_llm, pinecone_index):
    set_dependencies(embeddings=embeddings, llm=entity_llm, pinecone=pinecone_index)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac, embeddings, entity_llm, pinecone_index
    clear_dependencies()
