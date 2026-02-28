# Highport - TTRPG Campaign Management Platform

Real-time collaborative campaign management for Mongoose Traveller 2e, serving as a "second screen" for Foundry VTT.

## Features

- **Real-time Collaboration**: Multiple users can edit simultaneously with Yjs CRDT
- **Graph Visualization**: Interactive node graph for campaign entities (NPCs, locations, factions)
- **Faction Reputation Tracking**: Editable tables with live sync
- **Offline Support**: IndexedDB persistence for offline-first experience
- **RAG-powered Queries**: AI assistant with knowledge gating based on player permissions
- **Foundry VTT Integration**: Export actors to Foundry or sync in real-time

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)
- Python 3.11+ (for RAG service)
- Foundry VTT v12+ (for VTT integration)

## Quick Start

### 1. Core Platform (Web + Server)

```bash
# Install dependencies
pnpm install

# Start local PostgreSQL
docker compose up -d

# Run database migrations
pnpm --filter server db:migrate

# Start development servers (Web: 3010, Sync: 3011, API: 3012)
pnpm dev
```

The web app will be available at `http://localhost:3010`.

### 2. AI RAG Service (Optional)

The RAG service powers the "Ask Computer" feature.

```bash
cd apps/rag-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Start service (Port: 8000)
uvicorn main:app --reload
```

## Foundry VTT Integration

Highport bridges the gap between your campaign notes and the VTT.

### Installing the Bridge Module

To enable the connection, you must install the local package as a Foundry module.

1. Locate your Foundry VTT User Data directory.
2. Create a symlink from `packages/foundry-module` to `Data/modules/highport-bridge`.

**Linux/Mac:**
```bash
ln -s "$(pwd)/packages/foundry-module" "/path/to/FoundryVTT/Data/modules/highport-bridge"
```

**Windows:**
```powershell
mklink /D "C:\Path\To\FoundryVTT\Data\modules\highport-bridge" "C:\Path\To\Repo\packages\foundry-module"
```

3. Restart Foundry VTT.
4. Enable "Highport Bridge" in your world's module settings.

### Manual Export

If you cannot use the bridge module, you can manually export data:
1. Select nodes in the Graph view.
2. Click the "Export to Foundry" button.
3. A ZIP file containing JSON Actor data will download.
4. Import these JSON files into Foundry VTT actors.

## Project Structure

```
apps/
  web/             # Next.js 14 frontend (React, Yjs, React Flow)
  server/          # Hocuspocus + Fastify backend (WebSocket sync)
  rag-service/     # Python FastAPI for RAG queries
packages/
  shared/          # Shared TypeScript types and utilities
  foundry-module/  # Foundry VTT bridge module
```

## Development

```bash
# Run all JS/TS development servers (via Turbo)
pnpm dev

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Build all packages
pnpm build
```

## Testing

**Important**: Run `docker compose up -d` before running server tests to ensure PostgreSQL is available.

### Unit & Integration Tests

```bash
# Run all unit tests
pnpm test

# Run specific app tests
pnpm --filter web test
pnpm --filter server test

# Watch mode for web tests
pnpm --filter web test:watch
```

### E2E Tests (Playwright)

E2E tests verify critical user flows including graph CRUD, table editing, and real-time sync between users.

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run E2E tests
pnpm e2e

# Run E2E tests with UI
pnpm --filter web e2e:ui
```

E2E test coverage:
- Graph node creation, selection, deletion
- Reputation table editing and sync
- Sync latency verification (<500ms between users)
- Performance testing (500 nodes, 5 concurrent users)

## Environment Variables

Create `.env` files in relevant apps as needed:

### apps/server/.env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/highport
```

### apps/rag-service/.env
```env
GOOGLE_API_KEY=your-gemini-api-key
PINECONE_API_KEY=your-pinecone-key
```

## Services

| Service | Local Port | Description |
|---------|------------|-------------|
| Web | 3010 | Next.js frontend |
| Hocuspocus | 3011 | WebSocket sync server |
| Fastify | 3012 | REST API server |
| RAG Service | 8000 | Python FastAPI |
| PostgreSQL | 5432 | Database |

## Architecture

### CRDT Sync
Highport uses Yjs for conflict-free replicated data types (CRDTs). The Hocuspocus server handles WebSocket connections and persists documents to PostgreSQL.

### Graph Visualization
The campaign graph uses React Flow for rendering and interaction. Nodes represent campaign entities (NPCs, locations, factions, etc.) and edges represent relationships.

### Offline Support
y-indexeddb provides offline persistence. Changes made offline are automatically synced when reconnecting.

## Troubleshooting

### Database connection errors
```bash
# Ensure PostgreSQL is running
docker compose up -d

# Check logs
docker compose logs postgres
```

### Sync not working
- Verify Hocuspocus server is running on port 3011
- Check browser console for WebSocket errors
- Clear IndexedDB if data is corrupted: Dev Tools > Application > IndexedDB > Delete database

### E2E tests failing
```bash
# Ensure dev server is not already running, or use:
CI=true pnpm e2e

# Install browsers if missing
npx playwright install chromium
```
