# HIGHPORT KNOWLEDGE BASE

> Generated: July 23 2026
> Branch: main
> Overview: Real-time collaborative TTRPG campaign management platform. Monorepo with Next.js 14 frontend, Hocuspocus/Fastify backend, and Python FastAPI RAG service.

## STRUCTURE

```
highport/
├── apps/
│   ├── web/            # Next.js 14 frontend (see apps/web/AGENTS.md)
│   ├── server/         # Fastify + Hocuspocus backend (see apps/server/AGENTS.md)
│   └── rag-service/    # Python FastAPI RAG (see apps/rag-service/AGENTS.md)
├── packages/
│   ├── shared/         # TypeScript types & utils (see packages/shared/AGENTS.md)
│   ├── mgt2e/          # MGT2E game data, no runtime deps (see packages/mgt2e/AGENTS.md)
│   └── foundry-module/ # Foundry VTT integration (see packages/foundry-module/AGENTS.md)
├── docs/               # Extracted protocols and architecture docs
└── docker-compose.yml  # PostgreSQL (port 18123)
```

## WHERE TO LOOK

| Task                      | Location                              |
| ------------------------- | ------------------------------------- |
| Add new Yjs document type | `apps/web/lib/ydoc.ts`                |
| Database schema changes   | `apps/server/src/db/schema.ts`        |
| Add API endpoint          | `apps/server/src/api/index.ts`        |
| Shared types              | `packages/shared/src/types/`          |
| Frontend components       | `apps/web/components/`                |
| Chargen state management  | `apps/web/lib/chargen/`               |
| Chargen components        | `apps/web/components/chargen/`        |
| RAG pipelines             | `apps/rag-service/routers/`           |
| Sync / WebSocket server   | `apps/server/src/ws/hocuspocus.ts`    |
| GM approval logic         | `apps/web/lib/chargen/gm-approval.ts` |
| AI provenance types       | `apps/web/lib/chargen/types.ts`       |

## CODE MAP

| Symbol             | Type      | Location                            | Role                     |
| ------------------ | --------- | ----------------------------------- | ------------------------ |
| `GraphNode`        | Interface | packages/shared/src/types/graph.ts  | Core node schema         |
| `GraphEdge`        | Interface | packages/shared/src/types/graph.ts  | Core edge schema         |
| `createYDoc`       | Function  | apps/web/lib/ydoc.ts                | Creates campaign Y.Doc   |
| `HocuspocusServer` | Class     | apps/server/src/ws/hocuspocus.ts    | WebSocket sync server    |
| `documents`        | Table     | apps/server/src/db/schema.ts        | Drizzle schema           |
| `shouldShowDraft`  | Function  | apps/web/lib/chargen/gm-approval.ts | GM-approval display gate |
| `resolveAIDraft`   | Function  | apps/web/lib/chargen/state.ts       | GM accept/reject/edit    |
| `AIProvenance`     | Type      | apps/web/lib/chargen/types.ts       | AI output provenance     |

## CONVENTIONS

- **Package imports**: `@highport/shared/types`, `@highport/shared/utils/id` — never internal paths
- **Yjs patterns**: Nested `Y.Map<Y.Map<unknown>>` for entities, `doc.transact()` for multi-op changes
- **Package manager**: pnpm, NOT npm or yarn
- **Hot reloading**: Turbo handles cross-package rebuilds
- **Docker**: `docker compose up -d` before server tests (PostgreSQL on 18123)

## ANTI-PATTERNS

- **Do NOT** modify Y.Map before attaching to Y.Doc (critical Yjs behavior)
- **Do NOT** use pnpm without `--filter` for app-specific commands
- **Do NOT** skip `docker compose up -d` before server tests
- **Do NOT** use `as any` or `@ts-ignore` — fix the types properly
- **Do NOT** strip provenance when passing data between layers

## COMMANDS

```bash
pnpm dev              # All services via Turbo
docker compose up -d  # PostgreSQL (required for server tests)
pnpm build            # All packages via Turbo
pnpm test             # All tests via Turbo
pnpm e2e              # Playwright E2E tests
pnpm lint             # ESLint via Turbo
pnpm typecheck        # TypeScript via Turbo
pnpm format           # Prettier
```

## TESTING

| Type             | Framework  | Location            | Notes                             |
| ---------------- | ---------- | ------------------- | --------------------------------- |
| Unit/Integration | Vitest     | `apps/*/__tests__/` | Requires Docker for server        |
| E2E              | Playwright | `apps/web/e2e/`     | Requires all services running     |
| RAG              | pytest     | `apps/rag-service/` | Mocks for LLM/embeddings/vectordb |

Current: 34 test files, 241 tests passing. TSC exit 0.

## VERIFICATION CONTRACT

Verification is **mandatory** — "done" is not just when hardcoded tests pass. Match verification depth to your task type.

| Task Type       | L1 Static | L2 Unit | L3 E2E | L4 Agentic              |
| --------------- | --------- | ------- | ------ | ----------------------- |
| Any code change | ✅        | ✅      | -      | -                       |
| UI Component    | ✅        | ✅      | Opt    | ✅ Visual + Interaction |
| API Endpoint    | ✅        | ✅      | Opt    | ✅ curl + edge cases    |
| CRDT/Sync       | ✅        | ✅      | ✅     | ✅ Multi-user flows     |
| Full-Stack      | ✅        | ✅      | ✅     | ✅ All scenarios        |
| Bug Fix         | ✅        | ✅      | Reg    | ✅ Reproduce + variants |

**Detailed protocols:**

- L4 agentic testing: [docs/qa/agentic-testing.md](docs/qa/agentic-testing.md)
- Multi-user sync testing: [docs/qa/sync-testing.md](docs/qa/sync-testing.md)
- Holistic verification (`/verify-app`): [docs/qa/holistic-verification.md](docs/qa/holistic-verification.md)
- Acceptance scenario format: [docs/qa/acceptance-scenarios.md](docs/qa/acceptance-scenarios.md)

## INFRASTRUCTURE BLOCKER POLICY

**Rule: Never recommend running tests as a "next step" when the reason they can't run is fixable.**

| Gap size       | Action                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Small-medium   | **FIX OUTRIGHT.** Patch config, add fixture, wire server — then run tests. |
| Medium-complex | **FLAG AS CRITICAL BLOCKER.** Mark task `- [~]`, escalate immediately.     |

If a test is skipped because of a config gap, fix the config. If it's skipped because of a missing architectural feature, flag it as a blocker — never just note it and move on.

## REVIEW REQUIREMENT

Complex or cross-cutting changes require an independent post-implementation review after verification. Resolve blocking findings, with at most two repair/re-review cycles.

## CHARGEN STATE ARCHITECTURE

Chargen has specific architectural invariants for state management. See [docs/architecture/chargen-state.md](docs/architecture/chargen-state.md) for:

- Yjs Y.Map as authoritative state for all shared proposals
- AIProvenance lifecycle (draft → review → accepted/rejected/edited)
- GM approval modes (strict/moderate/lenient) and the `shouldShowDraft` gate
- Cross-character link dual-acceptance and CRDT-safe `acceptedBy` nested maps
- Entity spawning with provenance preservation

## ROUTING CONVENTIONS

**Instruction precedence:**

1. Root AGENTS.md (this file) — universal contract
2. Nearest subtree AGENTS.md — domain-specific rules
3. Linked protocol docs — detailed how-to

**Canonical-source rule:** Summaries route to canonical docs; they never duplicate procedures inline.

**Required-document loading:** When a skill references a protocol doc (e.g., `/verify-app` → `docs/qa/holistic-verification.md`), the agent MUST load that doc before execution.

## PRODUCT IDENTITY

Immersive, thematic, retro-sci-fi industrial. Dark mode, data-dense but readable, terminal-like UI. See [docs/design/design-context.md](docs/design/design-context.md) for full design direction.

## SUB-AGENTS.md INDEX

| File                                                                   | Domain                                |
| ---------------------------------------------------------------------- | ------------------------------------- |
| [apps/web/AGENTS.md](apps/web/AGENTS.md)                               | Frontend, Yjs, React Flow, chargen UI |
| [apps/server/AGENTS.md](apps/server/AGENTS.md)                         | Backend, Hocuspocus, Drizzle, API     |
| [apps/rag-service/AGENTS.md](apps/rag-service/AGENTS.md)               | Python RAG, providers, mocking        |
| [packages/shared/AGENTS.md](packages/shared/AGENTS.md)                 | Shared types, import patterns         |
| [packages/mgt2e/AGENTS.md](packages/mgt2e/AGENTS.md)                   | MGT2E game data, career tables        |
| [packages/foundry-module/AGENTS.md](packages/foundry-module/AGENTS.md) | Foundry VTT bridge                    |
