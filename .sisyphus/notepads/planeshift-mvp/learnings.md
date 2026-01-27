
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

## Task 14 - Foundry Bridge Module Setup
- **Foundry V12 ESM Modules**: Foundry VTT V12+ uses ES modules (`esmodules` in module.json). Must use `export` syntax, not CommonJS.
- **Settings Registration Timing**: `game.settings.register()` must be called during `Hooks.once('init')` - this is when Foundry initializes the settings system.
- **WebSocket Handshake Pattern**: Since WebSocket clients can't reliably set custom HTTP headers, send authentication via JSON message after connection: `{type: 'handshake', apiKey: '...', clientType: 'foundry', version: '1.0.0'}`.
- **Exponential Backoff Formula**: `baseDelay * 2^(attempt-1)` gives 1s, 2s, 4s, 8s, 16s delays for max 5 attempts.
- **Foundry Localization**: Use `game.i18n.localize('NAMESPACE.Key.Path')` with nested JSON structure in `lang/en.json`.
- **Global Connection State**: Exported `connection` instance allows external access/testing while `PlaneShiftConnection` class enables custom instantiation.

## Task 14 (Refined) - Foundry Module Initialization
- **Modular File Structure**: Split settings/socket logic into separate ES modules (`scripts/settings.js`, `scripts/socket.js`) for cleaner separation of concerns. Main `module.js` only handles hooks and orchestration.
- **Localization Keys vs Runtime Translation**: Use raw localization keys (`"PLANE_SHIFT.Settings.ServerUrl.Name"`) in `game.settings.register()` - Foundry automatically resolves them at display time. Don't call `game.i18n.localize()` during registration.
- **WebSocket URL Construction**: Server URL is stored as base URL (e.g., `ws://localhost:3002`), then `/foundry` path is appended in the FoundryBridge constructor. This keeps configuration clean while enabling endpoint-specific routing.
- **Export Pattern for Foundry Modules**: Export both the bridge instance AND the class: `export { bridge, FoundryBridge }`. This allows external modules to access current connection state or create custom instances.

## Task 15 - Foundry → PlaneShift Sync
- **@fastify/websocket v8 Breaking Change**: In version 8+, the handler's first parameter is `SocketStream` (a Duplex stream), not the WebSocket directly. Listen for `data` events on the stream, not `message` events: `connection.on('data', (data: Buffer) => {...})`. Access the underlying WebSocket via `connection.socket.send()` for responses.
- **Foundry Hook Filtering**: Use `actor.hasPlayerOwner` to filter to only party-relevant actors, and `userId !== game.user.id` to avoid echo loops where changes made by this client trigger sync back.
- **Whitelist-Based Sync**: Only syncing whitelisted paths (`system.hits`, `system.characteristics`, etc.) prevents excessive data transfer and focuses on game-relevant state changes.
- **Field Mapping in Sync**: Transform Foundry's data structure (e.g., `system.hits.value` → `hp.current`) at sync time to match PlaneShift's metadata schema, keeping the server-side simple.
- **requestId Pattern**: Including a unique `requestId` in messages enables reliable ack/nack handling for sync operations.

## Task 15 - Foundry → PlaneShift Actor Sync
- **@fastify/websocket SocketStream Pattern**: In @fastify/websocket v8, the WebSocket handler receives a `SocketStream` (Duplex stream), not a raw WebSocket. Access the actual WebSocket via `connection.socket`, then use standard WebSocket events (`message`, `close`, `error`).
- **Side-Effect Imports for Hooks**: Importing a module purely for side effects (e.g., `import "./scripts/sync.js"`) registers Foundry hooks at module load time. No explicit function call needed since hooks are registered at top-level.
- **TypeScript ws Types**: @fastify/websocket's types depend on `ws` module. Adding both `ws` and `@types/ws` as dependencies ensures proper typing for WebSocket class. Import as `import type { WebSocket as WS } from 'ws'` to get the correct type.
- **Field Mapping at Sync Layer**: The sync.js `buildSyncPayload` maps mgt2e actor paths (e.g., `system.hits.value`) to PlaneShift metadata structure (`hp.current`). This keeps Foundry-specific schemas isolated from the PlaneShift data model.
- **hasPlayerOwner Guard**: Using `actor.hasPlayerOwner` filters to party members only, avoiding sync of GM-only NPCs/creatures. Combined with `userId !== game.user.id` check to prevent echo when receiving server updates.
