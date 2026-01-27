# RAG SERVICE KNOWLEDGE BASE

> Generated: Tue Jan 27 2026
> Overview: Python FastAPI service providing RAG-powered AI assistance with permission-gated access.

## OVERVIEW

- **Purpose**: Serve AI responses grounded in campaign data, respecting player/GM visibility scopes.
- **Framework**: FastAPI (Python 3.10+)
- **Port**: 8000
- **AI Provider**: Google Gemini (via `providers/gemini.py`)
- **Vector DB**: Pinecone (via `services/pinecone_client.py`)

## STRUCTURE

```
apps/rag-service/
├── main.py              # FastAPI entry point, CORS, middleware
├── conftest.py          # Pytest fixtures and configuration
├── routers/             # API Endpoints
│   ├── query.py         # Main RAG query endpoint with streaming
│   ├── ingest.py        # Document ingestion (admin only)
│   └── scope.py         # Permission scope resolution
├── services/            # Business Logic
│   ├── chunker.py       # Text chunking strategies
│   ├── entity_extractor.py # NER for graph nodes
│   └── pinecone_client.py  # Vector DB interface
├── providers/           # External Service Adapters
│   ├── gemini.py        # Google Gemini LLM implementation
│   └── embeddings.py    # Embedding generation
└── mocks/               # Test Doubles
    ├── mock_gemini.py   # Fake LLM responses
    └── mock_pinecone.py # In-memory vector store
```

## KEY MODULES

| Module | Role | Key Function |
|--------|------|--------------|
| `routers.query` | Handles chat requests | `query(request, headers)` |
| `providers.gemini` | LLM generation | `stream_with_context(query, context)` |
| `services.pinecone` | Vector retrieval | `query(embedding, filter, top_k)` |
| `routers.scope` | Security | Determines `public`, `gm`, `party` scopes |

## RAG VERIFICATION PROTOCOL

### Level 1: Static Gates
- **Type Checking**: `mypy .`
- **Linting**: `ruff check .`

### Level 2: Unit Tests
- **Command**: `cd apps/rag-service && pytest`
- **Requirement**: All tests must pass using mocks (no API calls).
- **Scope**: Verifies router logic, dependency injection, and scope filtering.

### Level 3: Integration Testing (Agentic)
1. **Start Service**: `uvicorn main:app --reload`
2. **Health Check**: `curl http://localhost:8000/health` -> `{"status": "ok"}`
3. **Query Test**: Send POST to `/query` with headers.
4. **Scope Verification**: Verify GM-only info is hidden from player queries.
5. **Streaming**: Ensure response is valid Server-Sent Events (SSE).

## CONVENTIONS

- **Dependency Injection**: Use `set_dependencies()` pattern in routers for easy mocking.
- **Async/Await**: All I/O (DB, LLM, Network) must be async.
- **Streaming**: Chat endpoints must return `StreamingResponse`.
- **Headers**: Context (User ID, GM status) is passed via `X-` headers.

## MOCKING PATTERN

We avoid calling external APIs in tests by using global dependency overrides:

```python
# In tests/test_query.py
from routers.query import set_dependencies
from mocks.mock_gemini import MockGemini

def test_query():
    set_dependencies(llm=MockGemini(), ...)
    # Run test...
    clear_dependencies()
```

## ANTI-PATTERNS

- **Hardcoded Secrets**: Never commit API keys. Use `.env`.
- **Blocking I/O**: Never use synchronous `requests` or `time.sleep`.
- **Global State**: Avoid global state except for the dependency injection overrides.
- **Leaking Data**: Ignoring `filter={"access_scope": ...}` in Pinecone queries.
