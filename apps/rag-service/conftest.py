import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from main import app
from mocks.mock_gemini import MockGeminiProvider
from mocks.mock_embeddings import MockEmbeddings
from mocks.mock_pinecone import MockPineconeIndex
from routers.ingest import set_dependencies, clear_dependencies
from mocks.mock_auth import AUTH_SECRET, SERVICE_SECRET, sign_token


@pytest.fixture(autouse=True)
def auth_environment(monkeypatch):
    monkeypatch.setenv("AUTH_SECRET", AUTH_SECRET)
    monkeypatch.delenv("HOCUSPOCUS_JWT_SECRET", raising=False)
    monkeypatch.setenv("RAG_SERVICE_SECRET", SERVICE_SECRET)


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {sign_token()}"}


@pytest.fixture
def service_headers() -> dict[str, str]:
    return {"X-RAG-Service-Secret": SERVICE_SECRET}


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
async def client(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=auth_headers) as ac:
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
async def ingest_client(embeddings, entity_llm, pinecone_index, service_headers):
    set_dependencies(embeddings=embeddings, llm=entity_llm, pinecone=pinecone_index)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=service_headers) as ac:
        yield ac, embeddings, entity_llm, pinecone_index
    clear_dependencies()
