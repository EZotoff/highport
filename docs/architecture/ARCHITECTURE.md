# Highport System Architecture

> How the ship is wired. For the product vision, see [CONCEPT.md](../../CONCEPT.md). For delivery status, see [ROADMAP.md](../../ROADMAP.md).

## Overview

Highport is a pnpm/Turborepo monorepo built around a Next.js 14 web frontend, a Fastify REST API, a Hocuspocus Yjs WebSocket server, a Python FastAPI RAG service, and a PostgreSQL database. Shared packages supply the canonical MGT2E rules engine, shared TypeScript types, and an experimental Foundry VTT module. The system is organized into three tiers. Character creation (Tier A) is in progress. Campaign management (Tier B) has its foundations shipped. World simulation (Tier C) exists as architecture only. Each tier reuses the same service mesh but layers additional behavior on top.

The stack runs on free local providers (Ollama, ChromaDB) out of the box. Cloud providers (Gemini, Pinecone, OpenAI) are opt-in. pnpm workspaces and Turborepo orchestrate builds, tests, and type-checking across the monorepo. `packages/shared/` contains the TypeScript contracts that keep the web app, Fastify server, and Foundry module in sync. `packages/mgt2e/` is the only source of truth for Traveller mechanics. Nothing in the web app or RAG service is allowed to reroll or override a rulebook result. The monorepo structure ensures that a change to the rules engine or shared types propagates to all consumers in a single build. All environment-specific configuration is isolated to `.env` files; no secrets are hard-coded in source code, though `.env` files with real API keys were accidentally committed to the repository and are being rotated (see ROADMAP.md Known Issues). The project follows a strict separation between configuration and code to support multiple deployment environments.

New contributors should start with the `apps/web` and `apps/server` services before touching the RAG service, as the Python environment requires additional setup.

## Core Technologies

| Component | Technology                           | Role                                |
| --------- | ------------------------------------ | ----------------------------------- |
| Frontend  | Next.js 14, React Flow, Yjs          | Web UI, graph editor, CRDT client   |
| API       | Fastify, NextAuth v5, Drizzle ORM    | REST endpoints, auth, migrations    |
| Sync      | Hocuspocus, Yjs, WebSocket           | Real-time document collaboration    |
| AI        | Python FastAPI, Ollama/Gemini/OpenAI | RAG, generation, embeddings         |
| Vector DB | ChromaDB / Pinecone                  | Document retrieval                  |
| Database  | PostgreSQL                           | User data, campaigns, doc snapshots |

WebSocket carries CRDT updates. HTTP/SSE carries AI queries and responses. SQL carries persistence. This separation keeps the real-time sync layer lightweight while the RAG service handles heavy LLM workloads independently. Next.js 14 was chosen for its App Router and server component model, though CRDT pages use client components to avoid hydration mismatches. Fastify was chosen over Express for its built-in schema validation and plugin architecture. Python FastAPI was chosen for the RAG service because the ML ecosystem is Python-first. ChromaDB was chosen as the default vector database because it runs embedded and requires no external service.

The technology stack prioritizes local-first operation so that a single developer can run the entire system on a laptop without cloud dependencies.

## Repository Layout

```
highport/
├── apps/
│   ├── web/                  # Next.js 14: chargen wizard, React Flow graph,
│   │                         # portrait UI, real-time Yjs client
│   ├── server/               # Fastify: REST API, NextAuth v5, campaigns/users
│   └── rag-service/          # Python FastAPI: LLM/embeddings/vectordb
│                               providers, RAG routers
├── packages/
│   ├── mgt2e/                # MGT2E rules engine, SRD starter data,
│   │                         # external pack loader via GAME_DATA_DIR
│   ├── shared/               # Shared TypeScript types and constants
│   └── foundry-module/       # Experimental Foundry VTT integration
├── docker-compose.yml        # PostgreSQL
└── turbo.json
```

`apps/web/` is a Next.js 14 application using the App Router. It contains the chargen wizard under `components/chargen/`, the graph editor under `components/graph/`, and the portrait gallery. `apps/server/` is a Fastify API with NextAuth v5 handling authentication and Drizzle ORM talking to PostgreSQL. `apps/rag-service/` is a Python FastAPI application with a provider factory pattern for LLMs, embeddings, and vector databases. `turbo.json` defines the pipeline so that `pnpm dev` starts all services in the correct order.

`packages/shared/` exports TypeScript types for campaigns, users, characters, and graph nodes. Both `apps/web` and `apps/server` import it. `packages/mgt2e/` exports the rules engine and data loader. Only `apps/web` imports it directly. `packages/foundry-module/` imports `shared` for typed sync messages.

The `mgt2e` package has no external runtime dependencies beyond Node.js, making it safe to import into any JavaScript environment.

## Package Dependency Graph

`apps/web` depends on `@highport/mgt2e` and `@highport/shared`. `apps/server` depends on `@highport/shared`. `packages/foundry-module` depends on `@highport/shared`. No package depends on `foundry-module`. The build order is: `shared` first, then `mgt2e`, then `web` and `server` in parallel, then `foundry-module` last. The RAG service is a Python app and doesn't consume TypeScript packages directly; it shares contracts through HTTP and environment variables.

## Service Map

```
┌─────────────┐     WebSocket      ┌─────────────┐     SQL       ┌─────────────┐
│   Web App   │ ◄────────────────► │  Hocuspocus │ ◄───────────► │  PostgreSQL │
│  (Next.js)  │      Port 18121    │   Server    │               │  Port 18123 │
│  Port 18120 │                    │  Port 18121 │               │             │
└──────┬──────┘                    └─────────────┘               └─────────────┘
       │
       │ HTTP / HTTP/SSE
       ▼
┌─────────────┐     HTTP/SSE       ┌─────────────┐     LLM       ┌─────────────┐
│   Fastify   │ ◄────────────────► │    RAG      │ ◄──────────►│    Ollama   │
│  Port 18122 │                    │  Service    │   (local)   │  Port 11434 │
└─────────────┘                    │  Port 18124 │             └─────────────┘
                                   └─────────────┘
```

The web app also streams queries directly to the RAG service over SSE. Fastify does not proxy SSE query streams; those connect directly from browser to RAG to avoid double buffering.

**Web (port 18120):** Next.js 14 frontend.

- Hosts the chargen wizard, campaign graph editor, portrait UI, and real-time Yjs client.
- Communicates with Fastify for REST operations and opens SSE streams directly to the RAG service for AI queries.
- The chargen wizard is the most complex surface, with `TermResolutionStep` driving the mechanical core.
- The graph editor uses React Flow to render interactive node graphs for campaign relationships.
- Yjs documents are managed through hooks that wrap the Hocuspocus provider.
- Server-side rendering is disabled for CRDT-heavy pages to avoid hydration mismatches with Yjs state.
- The portrait gallery fetches generated images from Fastify and displays them with remix controls.
- App Router routes handle server-side data fetching for campaigns and characters, while client components manage the CRDT sync and graph editor interactivity.

**Hocuspocus (port 18121):** Yjs WebSocket server.

- Handles CRDT sync for shared documents. Player-facing docs live here. GM secrets don't.
- All document updates are persisted to PostgreSQL through Hocuspocus's database extension.
- Acts as the real-time collaboration layer for multiplayer character creation and shared campaign notes.
- IndexedDB on the client provides offline caching so work survives temporary disconnections.
- The server extension writes document snapshots to PostgreSQL on a configurable interval.
- Configuration lives in `apps/server/src/hocuspocus.ts` and handles auth hook validation before allowing sync.
- Clients authenticate with a token obtained from the Fastify session endpoint.
- The auth hook rejects connections without a valid session token, preventing unauthorized document access.

**Fastify (port 18122):** REST API.

- Manages campaigns, users, authentication via NextAuth v5, and proxies portrait requests to the RAG service.
- Serves as the trust boundary between the public internet and the internal RAG service.
- Currently, the web app streams queries directly to the RAG service over SSE, bypassing Fastify. This means the RAG endpoint is browser-facing and must eventually validate sessions independently. Routing all RAG traffic through Fastify (with authenticated proxying) is the target topology for production.
- Campaign creation, user invites, and document metadata all flow through here.
- Drizzle handles schema migrations and type-safe queries.
- The API is organized into route modules for campaigns, users, and characters.
- CORS is configured to allow the web app origin on port 18120.
- Portrait proxy endpoints validate the requesting user's campaign membership before forwarding to the RAG service.
- Route modules are organized under `apps/server/src/routes/` with subdirectories for campaigns, users, and characters.

**RAG Service (port 18124):** Python FastAPI.

- Routes queries via SSE, ingests PDF and text, manages knowledge scopes, generates narrative meat, and produces portraits.
- Routers include `query.py` (SSE streaming), `ingest.py` (PDF and text), `scope.py` (POST /update-scope), `narrative.py` (three endpoints), and `portrait.py` (image + tags).
- The service is stateless. All context comes from the vector database and the request payload.
- Loads providers through a factory pattern controlled by environment variables. FastAPI dependency injection wires the factories into each router.
- The ingest router chunks PDFs with a text splitter and stores metadata including filename, scope, and upload timestamp.
- Query routers validate the scope list before building the vectordb filter.
- Narrative generation uses a three-step pipeline: prompt construction, LLM generation, and response streaming via SSE.
- Portrait generation uses Gemini's image generation API with a structured prompt derived from the character's accepted meat.

**PostgreSQL (port 18123 host, 5432 container):** Persistent storage for users, campaigns, and document snapshots.

- Drizzle ORM handles schema management and migrations for the Fastify service.
- Hocuspocus persists Yjs document states here as well.
- The docker-compose file defines the container and volume.
- Migrations run via `pnpm --filter server db:migrate`.
- Backup strategy is left to the operator; the docker-compose volume is named `highport_postgres_data`.
- Schema changes are versioned and applied through Drizzle's migration CLI.

## Development Workflow

Local development starts with `pnpm install` to set up the monorepo. Docker Compose launches PostgreSQL on port 18123. `pnpm dev` invokes Turborepo, which reads `turbo.json` to start the web app, Fastify server, Hocuspocus, and RAG service in parallel. Each service has its own `.env` file copied from `.env.example`. Generate `AUTH_SECRET` with `crypto.randomBytes(32)` for NextAuth v5. Run `pnpm --filter server db:migrate` before the first start. The RAG service requires Ollama models to be pulled locally before queries will succeed. `ollama pull llama3.2` and `ollama pull qwen3-embedding:0.6b` are the current defaults. Hot reloading works for the web app and Fastify server. The RAG service uses `uvicorn` with `--reload` for automatic restarts on Python file changes. Hocuspocus restarts through `nodemon` in development.

Unit tests live next to the code they test. The web app uses Vitest for component and utility tests. The Fastify server uses Vitest for route handler tests with an in-memory SQLite database. The RAG service uses pytest for router and service layer tests. Integration tests cover the chargen wizard flow, the graph editor CRUD operations, and the RAG query pipeline. E2E tests are not yet implemented. CI runs the full test suite on every pull request via GitHub Actions. Coverage reports are generated but not enforced as gates.

## Operational Notes

All services log to stdout in development. Production logging is not yet configured. The RAG service exposes a health check at `GET /health`. Fastify exposes `GET /health` as well. Hocuspocus does not expose a dedicated health endpoint; liveness is inferred from WebSocket connection success. PostgreSQL health is checked via the docker-compose `healthcheck` directive. There is no centralized observability stack; operators tail logs per service. Backups of PostgreSQL are the operator's responsibility. The Yjs document snapshots in PostgreSQL serve as a form of backup for real-time state, but they should not be treated as the primary backup mechanism.

## Known Limitations

- Portrait generation requires a Gemini API key; local portrait models are not supported.
- The RAG ingest router only handles PDF and text; markdown, HTML, and JSON ingestion are not implemented.
- Per-character secrets (`char:<id>` scope) are architected but not enforced.
- The Foundry module is experimental and has not been tested at runtime with a live Foundry server.
- Voice generation and live TTS are not implemented.
- There is no mobile-specific UI; the web app is desktop-first.
- World simulation (Tier C) exists as architecture only; no code has been written.

## Deployment Notes

There is no production deployment automation yet. The system is designed to run on a single VM or a small Kubernetes cluster. The web app, Fastify server, and Hocuspocus can be containerized with Docker. The RAG service is already a container-friendly FastAPI app. PostgreSQL should run as a managed service or a StatefulSet in Kubernetes. Ollama can run on the same host for local LLM inference or be replaced with cloud APIs for production. Environment variables control all provider selection, so the same container image works for both local and cloud deployments.

Monitoring and alerting are not implemented; operators should rely on external tools like Prometheus or cloud provider metrics.

## Data Flow by Tier

### Tier A - Character Creation

The web chargen wizard in `apps/web/components/chargen/` calls `@highport/mgt2e` to roll a mechanically immutable skeleton.

- `TermResolutionStep` is the core engine, weighing in at 691 lines. It produces characteristics, career path, event triggers, skill tallies, rank, and aging. None of these can be rewritten by AI.
- The wizard uses a 5-step navigation with internal branching. Each step can loop or skip depending on the rules.
- Once the skeleton is ready, the RAG `narrative` router drafts meat at three verbosity levels. The player accepts, edits, or rejects each draft.
- Accepted canon is written to a shared Yjs document managed by Hocuspocus.
- When the session ends, the GM exports the finalized character to PostgreSQL.

Portrait generation flows from the web UI through Fastify to the RAG `portrait` router, which calls Gemini.

- Portraits inherit their entity's visibility. A player can't see a GM-secret NPC's portrait unless the GM promotes the entity to a wider scope.
- Multiplayer collaboration works via Yjs CRDT over Hocuspocus. Each player sees the same Yjs state, but the mechanical skeleton is always computed locally from the rules engine before any AI meat is requested.
- External game data packs load via the `GAME_DATA_DIR` environment variable, and SRD starter data is bundled in `packages/mgt2e/src/data/srd/`.
- The Yjs document shape for a character includes a `skeleton` map, a `meat` array with provenance, and a `portrait` object. This structure is versioned so future schema changes can migrate existing docs.
- Export writes the accepted character to the PostgreSQL `characters` table with a JSONB column for the full sheet. [Unverified] The export is idempotent; running it twice for the same characterId updates the existing row rather than creating a duplicate.
- Multiplayer chargen sessions allow multiple players to roll characters simultaneously, [Unverified] with each player's Yjs awareness cursor visible to the others.
- The export process also writes connection data to the graph so that accepted characters appear as nodes with their relationships pre-populated.

### Tier B - Campaign Management

Accepted canon entities move into the React Flow graph editor in `apps/web/components/graph/` for relationship mapping. Nodes represent characters, NPCs, locations, factions, and vessels. Edges represent relationships, debts, alliances, and rivalries. The graph is the canonical visualization of campaign connections. Lore ingestion flows through the RAG `ingest` router. It accepts PDF and text only. JSON ingestion isn't supported. Ingested chunks are embedded and stored with scope metadata. The ingest pipeline splits documents into chunks, embeds them, and writes the vectors with the current scope labels.

Queries travel from the web app to the RAG `query` router. The router resolves allowed scopes, currently via trusted headers (`X-Is-GM`, `X-Character-Id`), with a target of full server-side resolution. Path resolution follows a strict sequence: web app sends headers, scope list is built, vectordb metadata filter is applied, LLM receives scoped context, response streams via SSE. The `scope` router exposes `POST /update-scope` for promoting material into more restricted visibility. This lets the GM retroactively classify leaked information. Scope changes rewrite the metadata on existing vectordb entries.

The Ship's AI and GM Assistant are planned persona layers over the same RAG backend. Differences are limited to scope access and system prompts. They're not separate services. Ship's AI will be diegetic, speaking as the crew's computer. GM Assistant will be non-diegetic, seeing everything the GM sees and offering prep support. Both run through `query.py` with different scope lists and system prompts. Neither persona is a security boundary; the scope filter is. Campaign artifacts such as session logs, ship manifests, and faction briefs will eventually support the same verbosity modes as chargen, letting the GM generate scoped lore on demand. The graph data model stores nodes as JSONB in PostgreSQL and caches the layout in the Yjs document so collaborators see the same viewport and node positions. Edges carry a `type` field (ally, rival, debt, secret) and a `scope` field for visibility. [Planned] Scope changes on a node propagate to its connected edges automatically so that relationships inherit the most restrictive visibility of their endpoints. [Unverified] The graph editor supports undo and redo for layout changes, but structural changes (adding or removing nodes) are persisted immediately to prevent conflicts.

### Tier C - World Simulation

**The following is target architecture only. No Tier C code has been written. This section describes research directions, not implemented systems.**

Faction state would live in PostgreSQL. A turn engine would propose operations, score them with deterministic rules, and ask an LLM to explain tactics and flavor consequences. Resource ledgers would track credits, ships, troops, and influence. Goal hierarchies would decompose strategic ambitions into objectives and tasks. A decision engine would generate candidate moves. Resolution would apply costs, risk, and opposition. Results would surface in a GM review queue. Approved moves would become immutable events, publish to the graph, and feed back into RAG.

The event log would be append-only. Once a faction move is approved, it would become canon and feed the graph and RAG ingest pipeline. Tier C is architecture only. Nothing is implemented yet. The long-term goal is a sector that changes between sessions according to faction goals, resource flows, and player action consequences. A minimal viable Tier C is a single faction turn: snapshot state, generate candidate objectives, score with deterministic rules, LLM explains and proposes tactics, apply operation, surface to GM for approval, publish to the graph and RAG. From that seed, complexity would grow. Factions would be modeled as nodes in the graph with resource ledgers attached, so players could visualize power shifts through the same React Flow interface used for relationships. The event log schema would store `faction_id`, `operation_type`, `resources_delta`, `targets`, `outcome`, and `gm_approval_status`. The GM review queue would be a filtered view of the event log where `gm_approval_status` is `pending`. Approved entries would be locked; rejected entries would be soft-deleted and retained for audit. Faction turns are triggered manually by the GM.

## The Skeleton/Meat Contract

The MGT2E rules engine in `packages/mgt2e/src/` produces an immutable skeleton. Provenance is always `mgt2e-rule`. The package ships SRD starter data in `packages/mgt2e/src/data/srd/` and loads external packs via `GAME_DATA_DIR`. RAG `narrative_generator` produces draft meat: names, scenes, connection dynamics, skill backstories. Every generated piece carries provenance:

| Field         | Value                                              |
| ------------- | -------------------------------------------------- |
| `source`      | `mgt2e-rule` / `ai` / `player` / `gm`              |
| `mode`        | `brief` / `inspiration` / `full`                   |
| `status`      | `draft` / `accepted` / `rejected` / `edited`       |
| `derivedFrom` | `{ characterId, termNumber, eventId, rollResult }` |

The skeleton never changes after creation. Meat stays in draft until a human promotes it. The Yjs document holds the accepted state. Rejected drafts are soft-deleted from the player-visible Yjs document but retained in an access-controlled audit log for debugging and accountability. The `derivedFrom` field links every piece of meat back to the exact dice roll that produced its skeleton. Provenance is complete and auditable. A player can edit draft meat before accepting it, which changes the source to `player` and status to `edited`. Enforcement is split: the chargen engine guarantees skeleton immutability, the narrative generator tags meat as `ai`/`draft`, and the Yjs doc stores the final `accepted` or `edited` record. The contract is what makes the system trustworthy. You always know what the dice produced, what the AI proposed, and what you chose to keep. Immutability is enforced client-side by the rules engine returning frozen objects and the web app deep-freezing the skeleton before writing it to Yjs. Hard guarantees against forged rolls or mutated skeletons require server-side validation (append-only roll log, signed skeleton hashes, Yjs update rejection for skeleton paths). This is planned but not yet implemented. [Planned] Player editing of meat is done through an inline rich text component that tracks changes and submits the edited text with `source: "player"` and `status: "edited"`.

## Knowledge Gating Architecture

**Current:** The RAG `query` router trusts `X-Is-GM` and `X-Character-Id` headers from the web app to build a scope list (`public`, `party`, `gm`, `char:<id>`). That list becomes a metadata filter on the vector database. It's fast but it trusts the client. A malicious or buggy client could spoof headers and retrieve restricted documents. The scope list is constructed from headers at request time and passed directly into the vectordb query. Prompts themselves don't contain scope instructions; exclusion happens at retrieval.

**Target:** A server-side `resolveAllowedScopes(userId, campaignId)` call replaces header trust. Each document will carry a single `visibility_scope` security field and a separate `topic_tags` metadata field for non-security filtering. The `visibility_scope` field is a single-value security label. `topic_tags` are non-security metadata used for relevance filtering. They shouldn't be confused. The metadata filter in the vector database will use `visibility_scope` for hard exclusion and `topic_tags` for soft relevance. Trap-document canary tests will verify that no query can retrieve documents outside its resolved scopes. The trap-document test works by inserting a canary document into a restricted scope and asserting that a query without that scope cannot retrieve it.

The Ship's AI and GM Assistant personas are UX layers, not security boundaries. Scope filtering enforces secrecy. The persona only changes voice and context. A query with `party` scope will never see a `gm` document, regardless of whether the persona is the Ship's AI or the GM Assistant. The AI is genuinely ignorant of restricted content, not coached to hide it. The near-term stance treats all players as sharing `public` plus `party` scope. Per-character secrets are a target, not a v1 promise. Trap-document canary tests are planned to verify that GM-only content never leaks into player-scoped queries. They are not yet running. The canary documents are tagged with `topic_tags: ["test-canary"]` so they can be excluded from production queries.

## Yjs Secrecy Boundary

Yjs CRDTs solve merge conflicts. They don't solve secrecy.

**Current:** There is one shared party Yjs document per campaign. GM-only secrets stay server-side only and never enter the replicated document. This works for now but it limits what the GM can edit collaboratively. Any secret must live outside the CRDT, which means the GM edits it solo. The web app keeps GM secrets in local React state or Fastify-backed records, not in the Yjs document. IndexedDB provider caches the shared doc locally for offline support, which makes it even more important that secrets never enter the CRDT.

**Target:** Split documents by visibility:

- `campaign:{id}:public`
- `campaign:{id}:party`
- `campaign:{id}:gm`
- `campaign:{id}:char:{charId}`

GM secrets must never be placed in a document that players replicate. The `:gm` document replicates only to the GM's clients. Moving to split documents removes the risk of a client-side bug leaking GM-only nodes into player state. It also lets the system garbage-collect character-specific docs when a player leaves the campaign. The `:char:` docs hold personal journals, hidden agendas, and private debts. Implementation of split docs depends on the server-side scope resolver maturing first. The two efforts should ship together. Yjs providers are configured with resolvers that authenticate against the Fastify session before establishing the WebSocket connection. Document cleanup is manual for now; there is no automatic pruning of old Yjs snapshots from PostgreSQL. Operators should monitor disk usage and set a retention policy for the `documents` table.

## Provider Abstraction

The RAG service uses factory modules at `providers/{llm,embeddings,vectordb}/__init__.py`. Each factory exposes a consistent interface regardless of the underlying provider.

| Layer      | Default  | Cloud           |
| ---------- | -------- | --------------- |
| LLM        | Ollama   | Gemini / OpenAI |
| Embeddings | Ollama   | OpenAI          |
| Vector DB  | ChromaDB | Pinecone        |

The factory pattern lets operators swap providers by changing environment variables. No code changes are required to move from Ollama to Gemini, or from ChromaDB to Pinecone. The `rag-service/.env` file controls which factory is loaded at startup. Each factory module exposes `create_client()` and `get_config()` functions that the service layer consumes. Environment variables follow the pattern `LLM_PROVIDER=ollama`, `EMBEDDINGS_PROVIDER=ollama`, and `VECTORDB_PROVIDER=chromadb`.

**Resolved.** Both `services/narrative_generator.py` and `services/portrait_generator.py` now correctly import from the factory package (`from providers.llm import get_llm_provider`) rather than stale top-level files. The duplicate `providers/gemini.py` and `providers/base.py` files that previously existed at the top level have been removed. All provider access now routes through the factory. ChromaDB runs embedded in the RAG process for local development, while Pinecone requires an API key and environment name. Factory modules are tested with a mock provider that returns deterministic responses, allowing unit tests to run without external dependencies. Mock providers are configured by setting `LLM_PROVIDER=mock` in the test environment.

## AI Invasiveness Modes

The chargen wizard and future campaign surfaces support three verbosity levels per session:

| Public name | Internal value | What the LLM produces           |
| ----------- | -------------- | ------------------------------- |
| Brief       | `brief`        | 1-2 sentence gloss              |
| Inspiration | `inspiration`  | 2-4 sentences or an option list |
| Full        | `full`         | Full paragraph scene            |

`VerbositySelector` sets the verbosity level. It is threaded as a prop through the UI and sent to the `narrative_generator` in the request payload. The same mapping applies to event descriptions, NPC details, and connection suggestions. Extension to campaign artifacts in Tier B is planned. The canonical values are `brief`, `inspiration`, and `full` (defined as `VerbosityLevel` in [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts)). Inspiration is the default.

> **Known gap:** The selector currently writes to local React state in `ChargenWizard`, not to `SessionSettings.aiVerbosity` in the Yjs document. This means each browser has its own verbosity rather than the whole table sharing one setting. The session-level field exists in the type system but is not yet read by the live UI. There is also no GM control to change the session-level setting. See [ROADMAP.md](../ROADMAP.md) Known Issue #6. Additionally, enrichment is not auto-triggered when events are rolled — the player must click a button. See [ROADMAP.md](../ROADMAP.md) Known Issue #8. The `narrative/*` endpoints are also prompt-only and do not yet retrieve from the campaign vector store; see Known Issue #5.

## Foundry Integration Boundary

**In scope:** Bidirectional actor sync for accepted characters and NPCs; pushing social-scene context to the AI; suggested NPC dialogue and tactics.

**Out of scope:** Grid combat, token movement, rules adjudication, autonomous NPC actions.

The integration lives in `packages/foundry-module/` and is currently experimental. Bidirectional typed sync is architecturally supported, but runtime maturity is still being proven. Highport is the narrative and campaign intelligence layer. Foundry is the tactical tabletop runtime. The dividing line is simple: Foundry handles the grid, and Highport handles the conversation. Modules register hooks for actor creation and update events, then sync the relevant data back to the Highport API. The Foundry module manifest is at `packages/foundry-module/module.json` and declares the entry point, dependencies, and socket handlers. Socket handlers broadcast actor updates to connected Highport clients in real time.

## Security Posture

**Current:**

- NextAuth v5 with email and password
- Header-trust scope gating (`X-Is-GM`, `X-Character-Id`)
- `.env` files committed to the repo (known issue; secrets need rotation)

Committed `.env` files are a known debt. Rotating those secrets and moving to a secrets manager is a prerequisite for any production deployment. The current header-trust model is acceptable for local development and trusted LAN play, but it can't face the open internet. NextAuth v5 session strategy uses JWT by default. The `AUTH_SECRET` is generated with `crypto.randomBytes(32)` and appended to `apps/web/.env`. CI runs type-checking, linting, and unit tests via GitHub Actions on every pull request. Secrets management is manual for now; operators must rotate keys by hand and update `.env` files across all services. There is no centralized vault or secret injection pipeline. The `AUTH_SECRET` should be at least 32 bytes of cryptographically secure random data. Rotation requires restarting the web app and invalidating all active sessions. OAuth providers will be supported through NextAuth's built-in adapters for Google, GitHub, and Discord.

**Target:**

- OAuth providers as an option
- Server-side `resolveAllowedScopes`
- Rotated secrets, no committed credentials
- Trap-document canary tests for scope leakage
- Split Yjs documents by visibility

## Forward References

This document is a synthesis. Deeper architecture docs will be written as each tier matures and their interfaces stabilize:

- `llm-invasiveness.md` - Tier A/B verbosity mechanics
- `rag-knowledge-gating.md` - Scope resolver and vector DB filtering
- `state-schema.md` - Yjs document shapes and PostgreSQL schema
- `foundry-integration.md` - Bidirectional sync protocol
- `world-simulation.md` - Faction turn engine and event log (Tier C)

These documents will be created when the respective tiers reach sufficient maturity that their interfaces are unlikely to change. For now, this doc serves as the canonical synthesis. Contributors should coordinate with maintainers before drafting any of these sub-documents to avoid churn. The roadmap in `ROADMAP.md` defines which documents are prioritized for the current milestone. Tier A docs take precedence because the chargen wizard is the active development surface. Tier B docs follow as the campaign management features harden. Tier C docs remain speculative until the simulation engine begins implementation.

## Glossary

| Term                   | Definition                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Skeleton**           | Mechanically immutable character data produced by the MGT2E rules engine.                           |
| **Meat**               | AI-generated narrative texture drafted onto the skeleton.                                           |
| **Canon**              | Content that has been accepted by a player or GM and written to persistent storage.                 |
| **Scope**              | Visibility label (`public`, `party`, `gm`, `char:<id>`) controlling who can see a piece of content. |
| **CRDT**               | Conflict-free Replicated Data Type; the algorithm Yjs uses for real-time sync.                      |
| **RAG**                | Retrieval-Augmented Generation; the pattern of fetching relevant documents before prompting an LLM. |
| **SSE**                | Server-Sent Events; the streaming protocol used for AI query responses.                             |
| **Trap-document**      | A canary document inserted into a restricted scope to test for leakage.                             |
| **Hocuspocus**         | The Yjs WebSocket server that handles real-time document sync.                                      |
| **Drizzle**            | The TypeScript ORM used for PostgreSQL schema management and queries.                               |
| **NextAuth v5**        | The authentication library used for email/password and future OAuth support.                        |
| **React Flow**         | The library used for the interactive campaign graph editor.                                         |
| **TermResolutionStep** | The core MGT2E rules engine component that resolves a single character term.                        |
| **SRD**                | System Reference Document; the starter data bundled with the rules engine.                          |
| **GM**                 | Game Master; the person running the campaign.                                                       |
| **PC**                 | Player Character; a character controlled by a player.                                               |
| **NPC**                | Non-Player Character; a character controlled by the GM.                                             |
| **Session**            | A single play period, often mapped to a single Yjs document lifecycle.                              |
