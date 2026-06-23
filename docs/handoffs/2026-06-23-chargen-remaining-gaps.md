# Handoff: Tier A Chargen — Remaining Gaps

## Session Context

**Date**: 2026-06-23
**Branch**: main
**Prior session commits**: 7 (see below)
**Team mode**: Enabled — work streams below are designed for parallel team members.

## What Was Accomplished (Prior Session)

### Engine Mechanics (Wave 0)

- Reenlistment penalty fix: only counts OTHER-career terms, not same-career
- Mustering-out state persistence to Yjs (MusteringState interface wired)
- FSM step collapse fix: term_resolution and mustering_out map to distinct steps
- handleNext fix: Continue button now advances background → career_selection
- Commission mechanic: 2d6+SOC_DM target 8+, military only, officer rank track
- Aging mechanic: 2d6+END_DM minus totalTerms, age 34+, tiered stat loss

### Career Data (Wave 1)

- All 12 MGT2E careers with full data: Agent, Army, Citizen, Drifter, Entertainer, Marine, Merchant, Navy, Noble, Rogue, Scholar, Scout
- Each has: qualification, 2-3 assignments, 5 skill tables (personal/service/advanced/officer), enlisted+officer ranks, cash/benefit tables, 11 events, 6 mishaps
- Creative text paraphrased per licensing considerations (mechanical data is factual game rules)
- Career list refactoring: hardcoded arrays replaced with getAllCareers()

### AI Enrichment (Wave 3)

- Verbosity renamed: minimal/structured/rich → brief/inspiration/full
- AIProvenance<T> wrapper type: tracks source, mode, status, derivedFrom
- Backend: guidance field on request, mode/guidance_used on response, structural mode differentiation
- Frontend: Reject button + Regenerate-with-Guidance collapsible UI (4-state lifecycle)
- ConnectionSuggestions dismissals persist to Yjs
- EntitySpawnForm verbosity bug fixed

### Infrastructure

- Isolated QA browser on port 18125 (CDP) — `scripts/qa-browser.sh`
- Rag-service Ollama compatibility fixes (think=False for Qwen3, list-to-string coercion)
- B2 multi-term lifecycle QA charter created

### Browser-Verified

- Full 5-phase term resolution lifecycle (Survival → Event → Skill Training → Commission → Advancement)
- Army qualification with correct DMs and targets
- Officer Skills table correctly disabled when not commissioned
- Commission failure correctly allows advancement
- Mustering out with benefit + cash rolls
- AI enrichment: Generate, Reject, Refine-with-Guidance, Regenerate+Guidance all work end-to-end
- Three verbosity modes produce structurally different output

## Commits on Main

```
056c471 fix(rag-service): handle Qwen3 think-tags and JSON list descriptions
555d876 feat(qa): isolated QA browser on port 18125 via CDP
0c2c36b fix(chargen): wire handleNext to advance FSM status
cb17fdf feat(chargen): AI enrichment — provenance, guidance, reject UI
b99c271 feat(mgt2e): all 12 MGT2E careers with full data
a768f23 fix(chargen): engine mechanics — commission, aging, FSM, mustering persistence
```

## Services

| Service       | Port  | Status  | Start Command                                                                                          |
| ------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------ |
| Web (Next.js) | 18120 | Running | `pnpm dev` (turbo, via tmux session `dev`)                                                             |
| Hocuspocus    | 18121 | Running | Part of `pnpm dev`                                                                                     |
| Fastify       | 18122 | Running | Part of `pnpm dev`                                                                                     |
| PostgreSQL    | 18123 | Running | `docker compose up -d`                                                                                 |
| RAG Service   | 18124 | Running | tmux session `rag`: `cd apps/rag-service && source venv/bin/activate && uvicorn main:app --port 18124` |
| QA Browser    | 18125 | Running | `scripts/qa-browser.sh start` then `agent-browser --cdp 18125`                                         |

**RAG config**: `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=hf.co/bartowski/Qwen_Qwen3-30B-A3B-Instruct-2507-GGUF:IQ3_XS`

**Test users**: `agent-qa-player1@example.com` / `test-password-123` (and player2)

## Remaining Work — Parallel Streams for Team Mode

### Stream A: Multi-Term + Aging Browser QA

**Goal**: Verify reenlistment and aging mechanics work over a 4-term playthrough.

**What to verify**:

1. Term 2 in same career: reenlistment has 0 penalty (W0-T1 fix)
2. Term 4 ends at age 34: aging check triggers automatically
3. Aging roll: 2d6 + END_DM - totalTerms, with stat reduction UI
4. Mishap path: adds 4 years + aging check
5. Multi-term mustering out: roll count = terms + rank_bonus

**How**: Use the isolated QA browser:

```bash
scripts/qa-browser.sh start  # If not already running
agent-browser --cdp 18125 open http://localhost:18120/login
# Login as agent-qa-player1@example.com / test-password-123
# Create character → background → career → 4 terms → mustering out → finalize
```

**Files to read first**:

- `docs/qa/charters/B2-multi-term-lifecycle.md` — the charter for this test
- `.opencode/skills/chargen-qa/SKILL.md` — QA skill with login flow, FSM states, browser automation primer

**No code changes expected** — this is verification only. If bugs are found, note them for Stream B/D to fix.

**Conflict**: None. This stream only drives the browser and reports findings.

---

### Stream B: Hocuspocus Auth Hardening

**Goal**: Replace the `dev-token` fallback in the Hocuspocus WebSocket provider with proper NextAuth JWT authentication.

**Current state**: `apps/web/lib/sync.ts:54` has `token: token || 'dev-token'` — any connection is accepted. The server-side `onAuthenticate` hook in `apps/server/src/ws/hocuspocus.ts` accepts this token.

**What to implement**:

1. Generate a JWT from the NextAuth session on the client side
2. Pass the JWT as the Hocuspocus token instead of 'dev-token'
3. Verify the JWT server-side in the `onAuthenticate` hook
4. Reject connections with invalid/expired tokens

**Files to modify**:

- `apps/web/lib/sync.ts` — replace dev-token with NextAuth JWT
- `apps/server/src/ws/hocuspocus.ts` — verify JWT in onAuthenticate

**IMPORTANT**: `apps/server/src/ws/hocuspocus.ts` was listed as a "pre-existing user-owned modified file" in the prior handoff. The user has now explicitly authorized working on it. Check `git diff` to understand what the user's prior changes are before modifying.

**Conflict**: May conflict with Stream A if the auth change breaks the QA browser session. Coordinate: either do auth work AFTER Stream A completes, or use a separate browser session.

**Skills**: Load `wisdom` skill for any NextAuth + Hocuspocus integration patterns.

---

### Stream C: Graph Export Verification

**Goal**: Verify that finalized characters become graph nodes and the ExportButton works.

**What to verify**:

1. Complete a character through to `finalized` status
2. Check that a GraphNode is created with type `'traveller'`
3. Check that GraphEdges connect spawned entities to the character node
4. Test the ExportButton if it exists on the finalized step
5. Navigate to `/graph` and verify the character appears

**Files to read first**:

- `apps/web/components/chargen/steps/FinalizeStep.tsx` — `handleCreateCharacter` calls `createCharacterNode()`
- `apps/web/lib/chargen/finalize.ts` — `createCharacterNode()` creates the GraphNode
- `apps/web/components/graph/` — graph visualization components

**How**: Use the QA browser to finalize a character, then check the graph page.

**Conflict**: Needs a browser session (can share with Stream A if sequenced, or use a separate CDP port).

---

### Stream D: Provenance Formalization + GM Controls

**Goal**: Document the skeleton/meat provenance model and test GM controls.

**Sub-tasks**:

1. **Provenance docs**: Write `docs/provenance-model.md` documenting:
   - Skeleton = mgt2e-rule provenance (immutable dice results, career data)
   - Meat = AI-generated texture (provenance wrapper tracks source/mode/status)
   - Player can accept/reject/edit meat; skeleton is permanent
   - Reference CONCEPT.md sections on provenance

2. **GM controls testing**: The GMControlPanel mounts but self-hides for non-GM users. Test:
   - GM can toggle allowed careers (now derived from getAllCareers())
   - GM can lock/unlock session
   - GM can approve/reject connection requests
   - Use the multiplayer invite flow (player1 = GM, player2 = joiner)

**Files to read first**:

- `apps/web/components/chargen/GMControlPanel.tsx`
- `apps/web/lib/chargen/useGMControls.ts`
- `docs/CONCEPT.md` — provenance model specification

**Conflict**: None — documentation + browser testing of existing UI.

---

## Hard Constraints (Carry Forward)

- **No type error suppression**: `as any`, `@ts-ignore`, `@ts-expect-error` are NEVER allowed
- **Bugfix rule**: Fix minimally. NEVER refactor while fixing.
- **Do NOT fix** the 2 pre-existing typecheck errors:
  - `apps/web/app/variant-a/page.tsx:1` — TerminalHomePage missing module
  - `apps/web/components/chargen/steps/BackgroundStep.tsx:105` — glint prop not on GlassPanel
- **Do NOT commit** `.sisyphus/evidence/` — it is gitignored
- **Do NOT touch** pre-existing user-owned modified files UNLESS explicitly part of your stream's scope (Stream B touches hocuspocus.ts — authorized)
- **Licensing**: Career data uses paraphrased text from the MGT2E CRB. Mechanical data (targets, formulas, cash curves) is factual. Creative text (events, mishaps, descriptions) must be paraphrased if >2-3 consecutive words from the book.

## Key Files Reference

| Purpose                                      | Path                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| ChargenWizard (FSM orchestrator)             | `apps/web/components/chargen/ChargenWizard.tsx`                           |
| TermResolutionStep (5-phase lifecycle)       | `apps/web/components/chargen/steps/TermResolutionStep.tsx`                |
| Career data (12 careers)                     | `packages/mgt2e/src/data/srd/careers/*.ts`                                |
| Career types                                 | `packages/mgt2e/src/types/career.ts`                                      |
| Chargen types (AIProvenance, MusteringState) | `apps/web/lib/chargen/types.ts`                                           |
| Yjs state management                         | `apps/web/lib/chargen/state.ts`                                           |
| Hocuspocus provider (dev-token)              | `apps/web/lib/sync.ts:54`                                                 |
| Hocuspocus server (onAuthenticate)           | `apps/server/src/ws/hocuspocus.ts`                                        |
| Narrative generator service                  | `apps/rag-service/services/narrative_generator.py`                        |
| Ollama LLM provider                          | `apps/rag-service/providers/llm/ollama.py`                                |
| QA skill (domain knowledge)                  | `.opencode/skills/chargen-qa/SKILL.md`                                    |
| B2 charter (multi-term lifecycle)            | `docs/qa/charters/B2-multi-term-lifecycle.md`                             |
| QA browser helper                            | `scripts/qa-browser.sh`                                                   |
| Port registry                                | `~/.sisyphus/ports.json`                                                  |
| CRB text (for reference)                     | `/tmp/crb_careers.txt` (may be cleaned up; re-extract from PDF if needed) |

## Team Mode Suggestions

For team_mode orchestration:

1. **Stream B (Hocuspocus auth)** can start immediately — pure code work, no browser dependency
2. **Stream A (Multi-term QA)** can start immediately — uses QA browser on port 18125
3. **Stream C (Graph export)** should wait for Stream A to produce a finalized character, OR create its own character independently
4. **Stream D (Docs + GM controls)** can start immediately — docs are independent, GM controls testing can use a second browser session

**Recommended parallelism**: Streams B + D start in parallel. Stream A starts in parallel but on the QA browser. Stream C waits for A or runs independently.

**Browser session management**: If multiple streams need the browser, allocate additional CDP ports from the traveller range (18126-18129 unused). Each stream gets its own `scripts/qa-browser.sh` instance with a different port.
