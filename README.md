# PlaneShift - TTRPG Campaign Management Platform

Real-time collaborative campaign management for Mongoose Traveller 2e, serving as a "second screen" for Foundry VTT.

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

## Project Structure

```
apps/
  web/           # Next.js 14 frontend
  server/        # Hocuspocus + Fastify backend
  rag-service/   # Python FastAPI for RAG
packages/
  shared/        # Shared TypeScript types
  foundry-module/ # Foundry VTT bridge module
```

## Development

```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Build all packages
pnpm build
```

## Testing

**Important**: Run `docker compose up -d` before running server tests to ensure PostgreSQL is available.

```bash
# Run all tests
pnpm test

# Run specific app tests
pnpm --filter web test
pnpm --filter server test

# Run E2E tests
pnpm e2e
```

## Services

| Service | Local Port | Description |
|---------|------------|-------------|
| Web | 3000 | Next.js frontend |
| Hocuspocus | 3001 | WebSocket sync server |
| Fastify | 3002 | REST API server |
| RAG Service | 8000 | Python FastAPI |
| PostgreSQL | 5432 | Database |
