# Highport

> The main terminal of your Traveller campaign.

Highport is an open-source companion for **Mongoose Traveller 2nd Edition** (MGT2E). It begins where Traveller is most distinctive, in the shipyard of character creation, and grows with your table into a living campaign memory, a ship's intelligence that speaks to your crew, and eventually a sector that breathes while you sleep in jump space.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![CI](https://github.com/EZotoff/highport/actions/workflows/ci.yml/badge.svg)](https://github.com/EZotoff/highport/actions/workflows/ci.yml)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%9D%A4-lightgrey)](https://github.com/sponsors/EZotoff)

---

![Screenshot](docs/screenshot-graph-populated.png)

### Screenshots

<table>
  <tr>
    <td><img src="docs/screenshot-chargen-background.png" width="300" alt="Character Creation" /></td>
    <td><img src="docs/screenshot-chargen-finalize.png" width="300" alt="Character Sheet" /></td>
    <td><img src="docs/screenshot-graph-character.png" width="300" alt="Campaign Graph" /></td>
  </tr>
  <tr>
    <td align="center"><b>Character Creation</b></td>
    <td align="center"><b>Character Sheet</b></td>
    <td align="center"><b>Campaign Graph</b></td>
  </tr>
</table>

---

## The Three Tiers

Highport is designed as three stages of a single tool:

| Tier  | Name                | What it is                                                                                | Status                                                                                              |
| ----- | ------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **A** | Character Creation  | A collaborative, replayable backstory engine built on MGT2E chargen.                      | Feature-complete — mechanics, 12 careers, gamified chapter summaries, and per-career flavor shipped |
| **B** | Campaign Management | A gated, voice-aware campaign memory for accepted characters and lore.                    | Foundations in place — RAG + knowledge scopes + portraits shipped                                   |
| **C** | World Simulation    | A living sector where factions move, resources shift, and borders bleed between sessions. | Research stage — architecture only                                                                  |

For the full vision, see [CONCEPT.md](./CONCEPT.md). For delivery status, see [ROADMAP.md](./ROADMAP.md).

---

## Features

### Shipped

- **[Shipped] MGT2E Character Creation** — Lifepath mechanics engine: characteristics, qualification, 4-phase term resolution, survival, events, advancement, mishaps, mustering out, rank, aging, and connections. All dice-driven; all immutable once rolled. All 12 MGT2E Core Rulebook careers ship in-repo: Agent, Army, Citizen, Drifter, Entertainer, Marine, Merchant, Navy, Noble, Rogue, Scholar, Scout. 44 core skill stubs are also included.
- **[Shipped] Configurable AI Invasiveness** — Three modes control how much texture the AI adds to your chargen: **Brief** (a 1-2 sentence gloss), **Inspiration** (several concrete hooks to pick from), and **Full** (a drafted scene with named NPCs and relationship implications). The default is Inspiration. The dice own the facts; the AI owns the texture. Every AI output is draft until you accept, edit, or reject it.
- **[Shipped] Real-time Collaborative Chargen** — Multiple players and a GM work in the same session simultaneously. Powered by Yjs CRDT (Conflict-free Replicated Data Type — a sync protocol that lets multiple clients edit shared state without conflicts) via Hocuspocus (the WebSocket server that relays Yjs updates), with participant panels, entity pools, connection requests, GM control, and live notifications.
- **[Shipped] Portrait Generation** — Gemini image model with remix support, integrated into character finalization and entity spawning.
- **[Prototype] Knowledge Gating** — Campaign memory is partitioned by scope: `public`, `party`, `gm`, and `char:<id>`. Scope metadata and retrieval filtering are implemented; the current trust model relies on client-supplied headers (`X-Is-GM`, `X-Character-Id`), which is acceptable for local play but must be replaced with a server-side authenticated resolver before serious multi-user deployment. Per-character secrets (`char:<id>`) are a target, not fully enforced yet. See [ROADMAP.md](./ROADMAP.md) Known Issues.
- **[Shipped] Multi-provider RAG** — RAG (Retrieval-Augmented Generation — querying an AI with a knowledge base of your campaign documents). Defaults to free local stack: Ollama (`llama3.2`) + ChromaDB + Ollama embeddings (`qwen3-embedding:0.6b`). Cloud options (Gemini, Pinecone, OpenAI) are opt-in.
- **[Shipped] Graph Visualization** — Interactive node graph for NPCs, locations, factions, and their relationships.
- **[Shipped] Offline Support** — IndexedDB persistence works even when disconnected.
- **[Shipped] Gamified Chargen Flow** — Each completed term renders as a Tyranny-style chapter card (career, key event, skills, rank, mishap, aging); finalize produces a stitched Service Record scrapbook. Per-career event flavor templates give each career its own voice. The dice own the facts; the chapters own the memory.

### Experimental

- **[Experimental] Foundry VTT Integration** — Architecture designed for bidirectional sync of accepted characters and NPCs. Runtime maturity is being proven. See [`packages/foundry-module/`](./packages/foundry-module/).

### Planned

- **[Planned] Ship's AI Persona** — A diegetic player-facing assistant (default persona: _The Steward_) that answers from ship's logs and campaign memory. Architectural seams are in place; the persona itself is not yet in code.
- **[Planned] GM's AI Assistant** — An omniscient prep assistant that sees GM-only records, proposes secrets, summarizes factions, and generates NPC dialogue.
- **[Planned] Voice / TTS / Audio** — Experimental and long-term. The system will never promise real-time speech it cannot deliver.
- **[Planned] Tier C — World Simulation** — Faction turns, resource ledgers, goal hierarchies, and a sector that changes between sessions. Architectural research only.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ezotoff/highport.git
cd highport

# 2. Install dependencies
pnpm install

# 3. Start PostgreSQL
docker compose up -d

# 4. Copy environment files and generate auth secret
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
cp apps/rag-service/.env.example apps/rag-service/.env
# Generate AUTH_SECRET (NextAuth v5 requires a random base64 secret):
node -e "console.log('AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))" >> apps/web/.env

# 5. Run database migrations
pnpm --filter server db:migrate

# 6. Start development servers
pnpm dev
```

The web app is now running at `http://localhost:18120`.

---

## AI Setup

To enable the "Ask Computer" AI assistant, you'll need the RAG service running. The fastest path uses free local providers (Ollama + ChromaDB) with no API keys required.

```bash
# Pull the required Ollama models
ollama pull llama3.2              # LLM for generation
ollama pull qwen3-embedding:0.6b  # Embedding model for retrieval
```

See the complete setup guide: [docs/rag-setup.md](./docs/rag-setup.md)

---

## Architecture

Highport uses a real-time CRDT sync engine powered by Yjs and Hocuspocus:

```
┌─────────────┐     WebSocket      ┌─────────────┐     SQL       ┌─────────────┐
│   Web App   │ ◄────────────────► │  Hocuspocus │ ◄───────────► │  PostgreSQL │
│  (Next.js)  │      Port 18121    │   Server    │               │  Port 18123 │
│  Port 18120 │                    │  Port 18121 │               │             │
└──┬───────┬──┘                    └─────────────┘               └─────────────┘
   │       │
   │ HTTP  │ HTTP/SSE (direct)
   ▼       ▼
┌─────────┐ ┌─────────────┐     LLM        ┌─────────────┐
│ Fastify │ │    RAG      │ ◄────────────► │   Ollama    │
│  Port   │ │  Service    │   (local)      │  Port 11434 │
│ 18122   │ │  Port 18124 │                └─────────────┘
└─────────┘ └─────────────┘
```

- **Web** (18120): Next.js 14 frontend with React Flow graph visualization
- **Hocuspocus** (18121): Yjs WebSocket server for real-time sync
- **Fastify** (18122): REST API for campaigns and user management
- **RAG Service** (18124): Python FastAPI for AI queries with knowledge gating. The web app streams queries directly to the RAG service over SSE (Server-Sent Events) for real-time token streaming; Fastify handles non-streaming REST.
- **PostgreSQL** (18123 host → 5432 container): Document persistence and user data

---

## Game Data

Highport supports custom game system data through a plugin import system. Place JSON files in the data import folder, and the system will load your custom content.

**Career Data**: All 12 MGT2E Core Rulebook careers are included: Agent, Army, Citizen, Drifter, Entertainer, Marine, Merchant, Navy, Noble, Rogue, Scholar, Scout. Mechanical data (die targets, skill tables, ranks, benefits, events, mishaps) is drawn from the _Mongoose Traveller 2nd Edition Core Rulebook_. Creative text (event and mishap descriptions) is paraphrased to respect Mongoose Publishing's proprietary content.

**Custom Overrides**: If you prefer to use your own data pack, set the `GAME_DATA_DIR` environment variable. The loader will use your external files instead of the built-in careers. The _Mongoose Traveller 2nd Edition Core Rulebook_ remains the authoritative source for all rule references.

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, branch naming conventions, and our pull request process.

Look for issues labeled `good first issue` to get started.

---

## Services

| Service     | Port  | Description                      |
| ----------- | ----- | -------------------------------- |
| Web         | 18120 | Next.js frontend                 |
| Hocuspocus  | 18121 | WebSocket sync server            |
| Fastify     | 18122 | REST API                         |
| RAG Service | 18124 | Python FastAPI for AI            |
| PostgreSQL  | 18123 | Database (host → 5432 container) |

---

## License

This project is licensed under the [MIT License](./LICENSE).

_Highport is a fan-made companion tool and is not affiliated with or endorsed by Mongoose Publishing. Mongoose Traveller 2nd Edition rule references require the_ Mongoose Traveller 2nd Edition Core Rulebook*. All 12 Core Rulebook careers ship in-repo with paraphrased descriptions; mechanical data is derived from the CRB. Custom data packs can still be loaded via `GAME_DATA_DIR`.*
