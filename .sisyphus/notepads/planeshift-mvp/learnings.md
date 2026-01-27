
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
