# RAG SERVICE KNOWLEDGE BASE

> Generated: Tue Jan 27 2026
> Overview: Python FastAPI service providing RAG-powered AI assistance with permission-gated access.

## OVERVIEW

- **Purpose**: Serve AI responses grounded in campaign data, respecting player/GM visibility scopes.
- **Framework**: FastAPI (Python 3.10+)
- **Port**: 18124
- **Default LLM**: Ollama `llama3.2` (local, no API key). Cloud options (Gemini, OpenAI) opt-in via env.
- **Default Vector DB**: ChromaDB (local, in `chroma_data/`). Pinecone is opt-in cloud.
- **Default Embeddings**: Ollama `qwen3-embedding:0.6b` (local). OpenAI opt-in.

> The README and `docs/architecture/ARCHITECTURE.md` describe the **default local stack** (Ollama + ChromaDB + Ollama embeddings). Earlier versions of this doc named Pinecone/Gemini as defaults — that was incorrect.

## STRUCTURE

```
apps/rag-service/
├── main.py              # FastAPI entry point, CORS, middleware, mounts 5 routers
├── conftest.py          # Pytest fixtures (mocks + httpx AsyncClient)
├── pytest.ini           # asyncio_mode=auto, testpaths=tests
├── requirements.txt     # No pyproject.toml — uses requirements.txt only
├── routers/             # API Endpoints
│   ├── query.py         # Main RAG query endpoint with SSE streaming
│   ├── ingest.py        # Document ingestion (admin only)
│   ├── scope.py         # Permission scope resolution (update-scope endpoint)
│   ├── narrative.py     # Chargen narrative generation
│   └── portrait.py      # Portrait generation
├── services/            # Business Logic
│   ├── chunker.py            # Text chunking strategies
│   ├── entity_extractor.py   # NER for graph nodes
│   ├── narrative_generator.py # AI narrative for chargen terms
│   └── portrait_generator.py  # AI portrait orchestration
├── providers/           # External Service Adapters (FACTORY PATTERN)
│   ├── llm/                  # LLM factory + adapters (ollama, gemini)
│   ├── embeddings/           # Embeddings factory + adapters (ollama, openai)
│   └── vectordb/             # Vector DB factory + adapters (chroma, pinecone)
├── schemas/             # Pydantic request/response models
└── mocks/               # Test Doubles
    ├── mock_gemini.py   # Fake LLM responses
    ├── mock_embeddings.py # Deterministic SHA-256-derived vectors
    └── mock_pinecone.py # In-memory vector store with $in filter support
```

## KEY MODULES

| Module | Role | Key Function |
|--------|------|--------------|
| `routers.query` | Handles chat requests (SSE) | `query(request, headers)` |
| `routers.ingest` | Document ingestion (admin) | uses `set_dependencies()` for DI |
| `routers.scope` | Scope resolution | `/update-scope` endpoint (NOT `/scope`) |
| `routers.narrative` | Chargen narrative | streams term/scene flavor |
| `routers.portrait` | Portrait generation | streams image bytes |
| `providers.llm` | LLM factory | `get_llm_provider()` reads env |
| `providers.embeddings` | Embeddings factory | `get_embeddings_provider()` reads env |
| `providers.vectordb` | Vector DB factory | `get_vectordb_provider()` reads env |

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
2. **Health Check**: `curl http://localhost:18124/health` -> `{"status": "ok"}`
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

- **Hardcoded Secrets**: Never commit API keys. Use `.env`. Known issue: live API keys were committed historically (ROADMAP.md §Known Issues); treat any existing `.env` content as toxic.
- **Blocking I/O**: Never use synchronous `requests` or `time.sleep`.
- **Global State**: Avoid global state except for the dependency injection overrides (`set_dependencies()` / `clear_dependencies()`).
- **Leaking Data**: Ignoring `filter={"access_scope": ...}` in vector DB queries. The header-trust model (`X-Is-GM`, `X-Character-Id`) is a known-issue prototype, NOT a production security boundary — do not promote it.
- **Trust `docs/rag-setup.md` as ground truth**: It contains known documentation bugs (wrong ingest example, wrong endpoint name). Verify against `apps/rag-service/routers/*.py` source.
- **Per-character secrets**: `char:<id>` scope is a target, not a v1 promise. Do not implement client-side assuming it is enforced server-side.
