# Phase 3: AI Narrative Layer - Learnings

## Implementation Date: 2026-02-01

---

## Key Decisions

### 1. snake_case Transformation
Frontend uses camelCase (TypeScript convention) but Python backend expects snake_case.
Solution: Transform request bodies in `narrative.ts` before sending to API.

### 2. Dependency Injection Pattern
Used global `set_dependencies()` / `clear_dependencies()` pattern in `routers/narrative.py`
for easy testing - same pattern as other routers in rag-service.

### 3. Verbosity State Location
Verbosity state lives in `ChargenWizard.tsx` and is passed down to child components.
This allows it to persist across wizard steps.

---

## Technical Notes

### Files Created/Modified

**Backend (apps/rag-service/)**
- `routers/narrative.py` - 3 endpoints: event-description, npc-details, suggest-connections
- `services/narrative_generator.py` - Core AI generation logic with Gemini
- `schemas/narrative.py` - Pydantic request/response models
- `tests/test_narrative.py` - 8 unit tests with mock generator

**Frontend (apps/web/)**
- `lib/chargen/narrative.ts` - API client with snake_case conversion
- `lib/chargen/useNarrative.ts` - React hooks (useEventNarrative, useNPCNarrative, useNarrativeAvailable)
- `components/chargen/VerbositySelector.tsx` - 3-button toggle UI
- `components/chargen/ConnectionSuggestions.tsx` - Connection suggestion UI
- `components/chargen/EntitySpawnForm.tsx` - Added AI generation buttons
- `components/chargen/steps/TermResolutionStep.tsx` - Event description + CRDT save
- `__tests__/narrative.test.ts` - 13 unit tests

### Type Updates
- Added `eventDescription?: string` to `CareerTermResult` in `types.ts`

---

## Blockers Encountered

### 1. GEMINI_API_KEY Not Set
All AI generation returns error: "GEMINI_API_KEY not set"
- Impact: Cannot test actual AI responses
- Workaround: Manual entry works, error handling verified

### 2. Hocuspocus Server Not Running
WebSocket connection fails on port 3011
- Impact: Cannot verify full CRDT persistence across sessions
- Workaround: IndexedDB local persistence works for offline-first

---

## Test Coverage

### Unit Tests (All Passing)
- Frontend: 13 tests in `__tests__/narrative.test.ts`
  - API response parsing
  - snake_case conversion
  - Error handling (API failure, network error)
  - Verbosity levels

- Backend: 8 tests in `tests/test_narrative.py`
  - Endpoint responses
  - Verbosity output length validation
  - Error code mapping (400, 503)

### Browser Testing
- VerbositySelector buttons toggle correctly
- Generate Description button appears in event phase
- Error messages display gracefully
- NPC form has all AI buttons
- Add to Campaign Graph works

---

## Future Improvements

1. **Add GEMINI_API_KEY** to enable full AI testing
2. **Start Hocuspocus** for sync testing
3. **Add caching** for generated descriptions to prevent duplicate API calls
4. **Add regeneration warning** when user has edited text

---

## Related Files for Reference
- Plan: `.sisyphus/plans/phase3-ai-narrative-layer.md`
- Evidence: `.sisyphus/evidence/phase3-ai-narrative/` (screenshot saved)
