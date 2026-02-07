# Portrait System Integration - Learnings

## Session Start: 2026-02-06

## 2026-02-06 Verified Implementation Status

### Phase 1 (Foundation) - 100% COMPLETE
- portraits table migration: `apps/server/drizzle/0004_tired_blue_blade.sql`
- PortraitTags TypeScript types: `packages/shared/src/types/portrait.ts` (122 lines)
- Pydantic models: `apps/rag-service/schemas/portrait.py` (268 lines)
- GraphNode.metadata has portrait_id and image_url fields
- StorageAdapter + LocalDiskStorageAdapter: `apps/server/src/storage/portrait-storage.ts`
- GeminiProvider image methods: `apps/rag-service/providers/gemini.py`
- Portrait router: `apps/rag-service/routers/portrait.py`
- PortraitService: `apps/server/src/services/portrait-service.ts` (493 lines)
- All 5 Fastify routes: `apps/server/src/routes/portraits.ts`

### Phase 2 (Integration) - 100% COMPLETE
- Generate Portrait button in EntitySpawnForm
- usePortrait hook: `apps/web/lib/portrait/usePortrait.ts`
- Portrait in FinalizeStep.tsx
- PC portraits marked protected

### Phase 3-4 Backend - COMPLETE, Frontend - MISSING
- calculateTagSimilarity, searchPortraits, enforceRemixPolicy all exist
- MISSING: PortraitLibrary, PortraitRemixer, portrait picker modal

### Compilation Status
- All typechecks pass, all 203 tests pass (66 server + 137 web)

### Key Patterns
- Use THEME_HEX for colors (Tailwind v4 no defaults)
- SciFiButton/SciFiInput from @/components/ui/scifi
- Dialog from @radix-ui/react-dialog via @/components/ui/dialog
- SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || http://localhost:3012


# Portrait Remix Implementation Learnings

## UI & Design System
- **Tailwind v4 Colors**: Avoid default color classes like `text-cyan-400`. Use `THEME_HEX` from `@/lib/design-system/themeUtils` for inline styles to ensure visibility.
- **SciFi Components**: Prefer using `SciFiButton`, `SciFiSelect`, and `SciFiBadge` for a cohesive sci-fi aesthetic.
- **Dialog Layout**: A `max-w-4xl` dialog works well for side-by-side comparison of source and remixed portraits.

## Portrait System
- **Remix Hook**: `usePortraitGenerator().remix()` is the standard way to call the remix API. It handles loading and error states.
- **Image Normalization**: Always normalize portrait URLs using the `SERVER_URL` prefix if they are relative paths (starting with `/api`).
- **Policy Enforcement**: Be aware that portraits can be `protected` and have `source_policy` (e.g., `subject_only`), which may limit remixing options on the server side.
- **Lineage**: Displaying `anchor_portrait_id` and `source_portrait_id` helps users understand the history of a portrait.
## Portrait System Integration Learnings

- Successfully integrated `PortraitLibrary` and `PortraitRemixer` into the character generation finalization step.
- Used `SciFiButton` with `theme="slate"` and `theme="violet"` for new actions.
- Implemented `filterTags` to scope library search to relevant Traveller/PC portraits.
- Ensured proper conditional rendering of modals based on session and portrait state.
- Verified that Tailwind v4 color classes are avoided in favor of `THEME_HEX` for inline styles where necessary (though the added components manage their own internal styling mostly).

- Integrated PortraitLibrary and PortraitRemixer into EntitySpawnForm.
- Used THEME_HEX for inline styles to avoid Tailwind v4 color class issues.
- Ensured SciFiButton usage matches existing patterns for consistency.
- Verified with typecheck.
## HTTP Caching Implementation

### Changes to portrait image endpoint (GET /api/portraits/:portraitId/image)
- Added ETag header based on portraitId (immutable content per ID)
- Added Cache-Control: public, max-age=31536000, immutable (1 year cache)
- Implemented If-None-Match handling for 304 Not Modified responses
- Preserved existing Content-Type header

### Rationale
- Portraits are immutable once generated (remix creates a NEW portrait with NEW ID)
- Aggressive caching is safe and reduces bandwidth + server load
- ETag enables efficient revalidation via 304 responses
- Aligns with HTTP best practices for immutable resources

### Verification
- Typecheck passes (exit 0)


## 2026-02-06 S3 Portrait Storage Adapter

- Added `S3CompatibleStorageAdapter` in `apps/server/src/storage/s3-storage.ts` implementing `savePortrait`, `loadPortrait`, and `getSignedUrl` for S3-compatible object stores.
- Adapter reads `PORTRAIT_S3_BUCKET`, `PORTRAIT_S3_REGION`, `PORTRAIT_S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`, with default region `us-east-1` and optional custom endpoint support.
- Uploads now set `ContentType` from portrait mime type; keys preserve existing `{portraitId}.{extension}` format via shared `extensionFromMime` helper.
- Added `createPortraitStorage()` factory in `apps/server/src/storage/portrait-storage.ts` that lazy-imports S3 storage when `PORTRAIT_STORAGE_TYPE=s3`, otherwise defaults to `LocalPortraitStorage`.
- Lazy import keeps local-storage runtime path independent from S3 implementation wiring while still supporting AWS SDK dependencies when explicitly enabled.

## IntersectionObserver Lazy Loading
- Implemented a local `LazyPortraitImage` component to optimize the portrait gallery.
- Used `rootMargin: '200px'` to preload images slightly before they enter the viewport.
- Combined `IntersectionObserver` for visibility detection with CSS transitions for smooth fade-in.
- Placeholder uses `animate-pulse` and `THEME_HEX` colors to maintain sci-fi aesthetic consistency.
- Native `loading="lazy"` kept as a secondary fallback.

## Portrait Generation Progress Indicators
- Implemented a multi-stage thematic progress indicator for portrait generation.
- Stages are time-based: Analyzing (3s), Generating (7s), Finishing (until complete).
- Uses Sci-Fi aesthetic with scanning line animation and pulsing rings.
- Integrated into EntitySpawnForm and FinalizeStep to replace basic "Generating..." text.
- Leverages THEME_HEX for color consistency in Tailwind v4 environment.

## 2026-02-07 PortraitService Integration Test Harness

- Added `apps/server/__tests__/portrait-integration.test.ts` with 11 integration tests covering generate, get image, search, attach, remix, and end-to-end generate->store->search->attach behavior.
- Mocked `fetch` globally with `vi.stubGlobal('fetch', ...)` to intercept `/ai/portraits/tags` and `/ai/portraits/image` calls, keeping tests fully offline.
- Used a custom `InMemoryPortraitStorage` adapter implementing `PortraitStorage` so portrait bytes are stored/loaded without disk I/O.
- Mocked `../src/db/client.js` with in-memory row storage and Drizzle-like `insert/select/update` chains to avoid PostgreSQL dependency.
- Mocked Drizzle `eq/and` in tests to produce predictable filter conditions for in-memory query evaluation.

## 2026-02-07 E2E Portrait Chargen Coverage
- Added `apps/web/e2e/portrait-chargen.spec.ts` with focused chargen + portrait smoke coverage and direct API checks.
- Used resilient chargen assertions (`/chargen` shell, step navigation, character initialization) without attempting full wizard completion.
- Added conditional `test.skip` guards for portrait UI actions (`Generate Portrait`, `Browse Library`) when portrait-enabled state is not reachable in baseline E2E setup.
- Added Fastify API checks using full URLs on port `3012` (not Playwright `baseURL`):
  - `POST /api/portraits/generate` returns 401 without `X-User-Id`
  - `GET /api/portraits/search?campaignId=...` returns 200 + array payload
  - `GET /api/portraits/nonexistent/image` returns 404
- Confirmed `pnpm --filter web typecheck` passes after introducing the new spec.
