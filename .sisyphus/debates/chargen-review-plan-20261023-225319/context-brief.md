# Context Brief: Chargen Holistic Review Planning

## Objective

Design a multi-agent, multi-perspective review of the chargen (character generation) functionality and its linked features in the Highport platform. The review will be executed by agents from DIFFERENT LLM families after this debate approves the plan.

## Operator Requirements

1. Focus: chargen functionality + linked features
2. Holistic: multiple distinct review angles
3. Multi-agent: different LLM families per angle (true model diversity, not one model with different prompts)
4. Debate first to plan, then orchestrate execution

## System Under Review (verified facts)

### Architecture

- Real-time collaborative TTRPG platform. Monorepo: Next.js 14 web (apps/web), Fastify+Hocuspocus server (apps/server), Python FastAPI RAG (apps/rag-service), packages/shared, packages/mgt2e (MGT2E game data), packages/foundry-module.
- State: Yjs Y.Doc with nested Y.Map<Y.Map<unknown>>; authoritative shared state. Hocuspocus WS sync server. PostgreSQL (Drizzle) on the server.
- Chargen state lives in `apps/web/lib/chargen/`: state.ts (sessions, characters, entity pool, connection requests, lifepath proposals), gm-approval.ts (shouldShowDraft/isCanonical/requiresReview gates over GM approval modes lenient/moderate/strict), types.ts (AIProvenance<T> lifecycle draft→accepted/rejected/edited, unwrapAIField backcompat), entity-spawner.ts (spawns GraphNode+GraphEdge into campaign graph + entity pool, with provenance), finalize.ts, useNarrative.ts, hooks.ts.
- Cross-character links: dual-acceptance with CRDT-safe acceptedBy nested maps; player-to-player cross-character proposal producer (recent commits 30e50a5, f099fe2, 2f12578 — Y.Map migration recently completed).
- AI provenance must be preserved when passing between layers (project anti-pattern rule).

### Known blast-radius signals (from codegraph)

- `resolveAIDraft` — 3 callers in GMControlPanel.tsx; tested.
- `getCrossCharacterLinks` — 6 callers (finalize.ts, useNarrative.ts); tested.
- `getCrossCharacterLinksMap` — 9 callers; ⚠️ NO covering tests.
- `SpawnEntityInput`/spawnEntity — ⚠️ NO covering tests.
- calculateSpawnPosition uses Math.random (determinism concern for CRDT/sync?).

### Linked features (in scope)

- Campaign graph (React Flow, nodes/edges spawned by chargen)
- GM approval flow (GMControlPanel)
- Narrative hooks (useNarrative)
- Finalization (finalize.ts → promotion to campaign entities)
- MGT2E rules data (packages/mgt2e career tables)
- Server-side sync (Hocuspocus) + persistence
- E2E: Playwright chargen specs exist; 34 test files / 241 tests passing as of AGENTS.md

### Available LLM families for execution (OMO routing)

- `oracle` — read-only high-IQ reasoning specialist (architecture/debugging)
- `code-reviewer` — read-only reviewer on GPT-6.1-Sol (code quality + security lanes)
- `ultrabrain` / `deep` / `unspecified-high` — strong-model categories (binding weight)
- `artistry` — creative/unconventional reasoning
- `mephistopheles` — adversarial category (red-team/chaos)
- `explore` / `librarian` — cheap recon agents
- Small categories (`quick`, `unspecified-low`) — advisory weight ONLY

## Deliverable of the Debate

An approved REVIEW PLAN specifying:

- b1 (claim): which review angles matter most for chargen+linked features and why
- b2 (implementation): agent/family assignment per angle, parallelization strategy, binding vs advisory weights
- b3 (implementation): evidence format — how findings are reported, persisted, verified (file-level receipts, not vibes)
- b4 (fallback): what happens if a reviewer family fails/times out; quorum rules
- b5 (risk): known gaps to force reviewers to check (untested symbols above, Math.random determinism, provenance stripping, cross-character dual-acceptance races)

## Constraints

- Review is read-only (no code changes in this phase)
- Verification contract of the repo applies: findings must cite file:line evidence
- Budget: prefer parallel background reviewers; wall-clock matters
