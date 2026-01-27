
## Task 8 - Reputation & Faction Table
- **Computed Fields in Yjs**: When storing data in Yjs that has derived properties (like `tier` from `standing`), computing and storing them during the update transaction ensures all clients see consistent data without duplicate logic.
- **Soft Linking**: Linking Yjs entities (Factions) to other Yjs entities (Graph Nodes) via string IDs is effective. The consuming component is responsible for resolving these IDs by subscribing to both data sources.
- **Color Gradients**: HSL (`hue-saturation-lightness`) is efficient for programmatically generating status colors (e.g., Red-to-Green gradient) without complex interpolation libraries.

## Task 10 - Python RAG Service Setup
- **Provider Abstraction Pattern**: Abstract base class (`LLMProvider`) with concrete implementations (`GeminiProvider`) enables swapping LLM backends without changing calling code. Lazy client initialization (`_ensure_client()`) defers API key validation until actual use.
- **Deterministic Mock Embeddings**: Using SHA256 hash of text to generate consistent 1536-dim vectors enables reproducible tests without actual OpenAI calls. The hash bytes are extended cyclically to fill the vector dimension.
- **pytest-asyncio Auto Mode**: Setting `asyncio_mode = "auto"` in pyproject.toml eliminates need for `@pytest.mark.asyncio` decorators on every async test (though I kept them for explicitness).
- **FastAPI Test Client**: Using `httpx.AsyncClient` with `ASGITransport` for testing FastAPI apps is the modern pattern, replacing deprecated `TestClient` for async endpoints.
- **Mock Call History**: Adding `call_history` lists to mocks enables test assertions on what methods were called with what arguments - useful for verifying service integration behavior.
- Implemented reputation system using Y.Map for factions.
- Used TanStack Table with Yjs observation pattern (similar to BaseResources).
- Created a separate `reputation-state.ts` for logic to keep components clean.
- Used `rgb()` based on value range for visual feedback in table cells.
- Clean separation of data transformation (`yMapToFaction`) helps with typing and testing.

## Task 11 - Document Ingestion Pipeline
- **Dependency Injection with Protocols**: Using Python `Protocol` classes for dependency typing enables duck typing while maintaining type safety. The `set_dependencies()`/`clear_dependencies()` pattern allows easy mock injection for tests without FastAPI's Depends system complexity.
- **tiktoken for Token Counting**: Using `tiktoken.get_encoding("cl100k_base")` with GPT-4's encoding provides accurate token counts. The chunking strategy with overlap (`target_tokens=500, overlap_tokens=50`) ensures context continuity between chunks.
- **Lazy PDF Import**: Importing `pypdf` inside the function (`from pypdf import PdfReader`) avoids import errors when the dependency isn't needed and keeps startup fast.
- **Entity Extraction Robustness**: Wrapping LLM JSON parsing with regex (`r"\{[^{}]*\}"`) handles markdown code blocks in responses. Falling back to empty entities on parse failure prevents pipeline crashes.
- **Fixture Composition**: Building complex fixtures (`ingest_client`) from simpler ones (`embeddings`, `entity_llm`, `pinecone_index`) via pytest dependency injection keeps test setup modular and reusable.
- **python-multipart Requirement**: FastAPI file uploads require `python-multipart` package - otherwise `UploadFile` parameters fail silently or with cryptic errors.
- **Scope Tag Metadata Pattern**: Storing `access_scope: ["public"]` as a list allows future multi-scope support without schema changes. Including `chunk_index`, `source_id`, `entities`, and `text` in metadata enables rich retrieval filtering.

## Task 9 - Graph-Table Linking
- **URL-Driven State**: Using URL parameters (`?focusNode=id`) combined with client-side state enables deep linking to specific graph views, allowing the table to "control" the graph via standard navigation.
- **Component Isolation**: Created `NodePanel` as a standalone component that subscribes to Yjs data independently given a nodeId. This decoupling makes it reusable and easier to test.
- **Visual Feedback**: Provided immediate visual feedback (Toast + Button Styles) for broken links (e.g., deleted nodes) directly in the table UI, improving user confidence.
- **Testing with Vitest**: Successfully tested React components using `@testing-library/react` and mocked Yjs data access, proving that complex CRDT-backed components can be unit tested effectively.

## Knowledge Gating & Access Control (Task 12)

### Drizzle ORM Mock Pattern
When mocking Drizzle's `db` for tests, tables expose their name through internal symbols, not `table._.name` directly. Use this helper to extract table names robustly:

```typescript
function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const tableObj = table as Record<string | symbol, unknown>;
  for (const key of Object.getOwnPropertySymbols(tableObj)) {
    const val = tableObj[key];
    if (val && typeof val === 'object' && 'name' in val) {
      return (val as { name: string }).name;
    }
  }
  if ('_' in tableObj && tableObj._ && typeof tableObj._ === 'object' && 'name' in tableObj._) {
    return (tableObj._ as { name: string }).name;
  }
  return '';
}
```

### Pinecone Filter Queries
For querying by metadata filter only (not similarity), use a zero vector:
```python
results = index.query(
    vector=[0.0] * 1536,  # Zero vector for filter-only queries
    filter={"source_id": {"$eq": source_id}},
    top_k=10000,
    include_metadata=True,
)
```

### React 'use client' Callback Props
The warning "Props must be serializable for components in the 'use client' entry file" for callback props like `onUpdate: () => void` is expected. Client components can receive function props when rendered by other client components.

## Task 12 - Knowledge Gating & Access Control
- **Drizzle Array Columns**: Use `.array()` modifier on text columns for PostgreSQL text arrays. Default values require `sql` template: `default(sql\`'{public}'::text[]\`)`.
- **Database CHECK Constraints**: Drizzle supports CHECK constraints via the `check()` function in the table config. Used `sql\`\${table.knowledgeTag} LIKE 'secret:%'\`` to enforce only secret tags can be stored.
- **Fastify Route Registration Pattern**: Created separate route files (`routes/knowledge.ts`, `routes/documents.ts`) with `registerXxxRoutes(fastify)` functions that get called from the main API index. Keeps route logic modular and testable.
- **Mock-Aware Testing**: For Fastify tests, mocking the database client with `vi.mock('../src/db/client.js')` and providing mock implementations allows testing route logic without a real database.
- **Cross-Service Communication**: The server calls RAG service for Pinecone updates. Using `try/catch` with a log warning allows graceful degradation if RAG service is unavailable.
- **Existing Code Discovery**: Found that `ScopeEditor.tsx` and `routers/scope.py` already existed from previous work, avoiding duplicate implementation. Always check for existing files before writing.
- **Python Test Environment**: Use `python -m pytest` instead of bare `pytest` to avoid module resolution issues with system-level pytest installations.
- **Icon Mocking in React Tests**: Mocking icon libraries (lucide-react) with simple span elements with data-testid makes tests work without the actual icon implementations.

## RAG System Implementation (Task 13)
- **FastAPI SSE Pattern**: Used `StreamingResponse` with `media_type="text/event-stream"` for real-time chat. Yielding `data: {json}\n\n` ensures compatibility with standard SSE clients.
- **Pytest Asyncio Strict Mode**: Encountered failures with `@pytest.fixture` on async fixtures. Switched to `@pytest_asyncio.fixture` to satisfy strict mode requirements in `pytest-asyncio`.
- **Vitest Alias Resolution**: Encountered issues with `@/lib/...` alias resolution in component tests. Switched to relative imports (`../../lib/...`) which proved more stable for this test setup.
- **Pinecone Metadata Filtering**: Implemented scope-based access control using Pinecone's metadata filters. Mock implementation required careful simulation of the `` operator for array fields.
