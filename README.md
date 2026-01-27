# PlaneShift - TTRPG Campaign Management Platform

Real-time collaborative campaign management for Mongoose Traveller 2e, serving as a "second screen" for Foundry VTT.

## Features

- **Real-time Collaboration**: Multiple users can edit simultaneously with Yjs CRDT
- **Graph Visualization**: Interactive node graph for campaign entities (NPCs, locations, factions)
- **Faction Reputation Tracking**: Editable tables with live sync
- **Offline Support**: IndexedDB persistence for offline-first experience
- **RAG-powered Queries**: AI assistant with knowledge gating based on player permissions

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local PostgreSQL
docker compose up -d

# Run database migrations
pnpm --filter server db:migrate

# Start development servers
pnpm dev
```

The web app will be available at `http://localhost:3000`.

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
# Run all development servers (via Turbo)
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planeshift
```

### apps/rag-service/.env
```env
GOOGLE_API_KEY=your-gemini-api-key
PINECONE_API_KEY=your-pinecone-key
```

## Services

| Service | Local Port | Description |
|---------|------------|-------------|
| Web | 3000 | Next.js frontend |
| Hocuspocus | 3001 | WebSocket sync server |
| Fastify | 3002 | REST API server |
| RAG Service | 8000 | Python FastAPI |
| PostgreSQL | 5432 | Database |

## Architecture

### CRDT Sync
PlaneShift uses Yjs for conflict-free replicated data types (CRDTs). The Hocuspocus server handles WebSocket connections and persists documents to PostgreSQL.

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
- Verify Hocuspocus server is running on port 3001
- Check browser console for WebSocket errors
- Clear IndexedDB if data is corrupted: Dev Tools > Application > IndexedDB > Delete database

### E2E tests failing
```bash
# Ensure dev server is not already running, or use:
CI=true pnpm e2e

# Install browsers if missing
npx playwright install chromium
```
