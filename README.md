# Highport

> The bridge of your campaign. Real-time. Open-source. Extensible.

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

## Features

- 🎮 **Real-time Collaboration** — Multiple users edit simultaneously with Yjs CRDT sync
- 🤖 **AI-powered Research** — Ask questions about your campaign lore with knowledge gating
- 🕸️ **Graph Visualization** — Interactive node graph for NPCs, locations, factions, and their relationships
- 📊 **Campaign Management** — Create, manage, and organize your TTRPG campaigns
- 💾 **Offline Support** — IndexedDB persistence works even when disconnected
- 🔌 **Extensible Game Data** — Plugin import system with starter content included

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
│  Port 18120 │                    │  Port 18122 │               │             │
└──────┬──────┘                    └─────────────┘               └─────────────┘
       │
       │ HTTP/SSE
       ▼
┌─────────────┐
│    RAG      │     LLM        ┌─────────────┐
│  Service    │ ◄────────────► │   Ollama    │
│  Port 18124 │   (local)      │  Port 11434 │
└─────────────┘                └─────────────┘
```

- **Web** (18120): Next.js 14 frontend with React Flow graph visualization
- **Hocuspocus** (18121): Yjs WebSocket server for real-time sync
- **Fastify** (18122): REST API for campaigns and user management
- **RAG Service** (18124): Python FastAPI for AI queries with knowledge gating
- **PostgreSQL** (18123 host → 5432 container): Document persistence and user data

---

## Game Data

Highport supports custom game system data through a plugin import system. Place JSON files in the data import folder, and the system will load your custom content.

**Starter Content**: A basic "Drifter" career and core skill list are included so you can start exploring immediately. For a full game system experience (additional careers, equipment tables, etc.), install a compatible game data pack.

---

## Contributing

We welcome contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions, branch naming conventions, and our pull request process.

Look for issues labeled `good first issue` to get started.

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for what is shipping now, what is coming next, and our long-term vision. Foundry VTT integration is experimental; see [`packages/foundry-module/`](./packages/foundry-module/).

Community input welcome. Open a GitHub Issue with the `feature-request` label to share what matters most to you.

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
