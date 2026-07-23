# SERVER (Fastify + Hocuspocus)

## OVERVIEW

Backend for Highport. Handles WebSocket sync via Hocuspocus and REST API via Fastify. Persists Y.Doc state to PostgreSQL.

## STRUCTURE

- `src/index.ts` - Single entry point. Boots **Hocuspocus (18121) + Fastify (18122) + compaction job** in one Node process.
- `src/api/index.ts` - Fastify bootstrap; mounts route modules from `src/routes/`
- `src/routes/` - REST route modules (`auth`, `campaigns`, `conflicts`, `documents`, `export`, `foundry`, `knowledge`, `portraits`)
- `src/ws/hocuspocus.ts` - Yjs WebSocket server
- `src/db/` - Drizzle ORM schema + client; `schema.ts` is the canonical schema
- `src/services/` - Domain services (`portrait-service.ts`, `scope.ts`)
- `src/storage/` - Storage adapters (`portrait-storage.ts`, `s3-storage.ts`)
- `src/jobs/` - Background jobs (`compaction.ts`)
- `src/lib/` - Cross-cutting utilities (`logger.ts`)
- `drizzle/` - Generated SQL migrations (gitignored from formatting)

## KEY MODULES

| File                               | Role                                                   |
| ---------------------------------- | ------------------------------------------------------ |
| `src/index.ts`                     | Process entry; starts WS + REST + compaction           |
| `src/ws/hocuspocus.ts`             | WebSocket server for Yjs sync (port 18121)             |
| `src/api/index.ts`                 | Fastify bootstrap + route registration (port 18122)    |
| `src/routes/*.ts`                  | REST route modules (auth, campaigns, etc.)             |
| `src/db/schema.ts`                 | Drizzle schema for `documents` and related tables      |
| `src/db/client.ts`                 | Database connection pool                               |
| `src/services/scope.ts`            | Knowledge-scope resolution (header-trust today)        |
| `src/services/portrait-service.ts` | Portrait generation orchestration                      |
| `src/storage/s3-storage.ts`        | S3-compatible object storage (portraits, assets)       |
| `src/routes/portraits.ts`          | Portrait generation, search, remix, and attachment API |

## HOCUSPOCUS PATTERNS

- **Configuration**: Server listens on port 18121. Configured in `src/ws/hocuspocus.ts`.
- **Persistence**: Uses the Hocuspocus `Database` extension to load snapshots, stores incremental updates in PostgreSQL, and compacts them into `documents` snapshots.
- **Hooks**:
  - `onAuthenticate`: Validates Hocuspocus JWTs.
  - `onConnect` and `onDisconnect`: Log document connections.
  - `onChange`: Stores incremental updates in `document_updates`; the compaction job writes snapshots.
- **Conflict Resolution**: Yjs automatically handles CRDT merging. Server is the source of truth for persistence order.

## API VERIFICATION PROTOCOL

After any backend changes:

### Level 1: Static Gates

- `pnpm --filter server typecheck` → exit 0
- `pnpm --filter server build` → exit 0

### Level 2: Unit/Integration Tests

- `docker compose up -d` (PostgreSQL required)
- `pnpm --filter server test` → all pass

### Level 3: API Testing (Agentic)

1. Ensure server is running (port 18122)
2. Test happy path:
   ```bash
   curl -X GET http://localhost:18122/health
   curl -X POST http://localhost:18122/api/documents -d '...'
   ```
3. Test error cases: 400, 401, 404, 500
4. Document response schemas

### WebSocket Verification

1. Connect to ws://localhost:18121
2. Verify Yjs sync handshake
3. Test document load/save persistence

## DRIZZLE PATTERNS

- **Schema**: Defined in `src/db/schema.ts`. Use descriptive column names.
- **Migrations**:
  1. Modify `schema.ts`
  2. Run `pnpm --filter server db:generate` to create migration SQL.
  3. Run `pnpm --filter server db:migrate` to apply.
- **Queries**: Prefer query builder pattern (`db.select().from(...)`).
- **Transactions**: Use `db.transaction(async (tx) => { ... })` for multi-step updates.

## ERROR HANDLING

- **Fastify**: Route handlers set reply codes for expected errors; unhandled errors use Fastify's default handler.
- **Status Codes**:
  - 400: Invalid request input
  - 404: Resource not found
  - 500: Internal server error (log stack trace)
- **Logging**: Use structured logging (pino). Do not log sensitive data.

## ANTI-PATTERNS

- **Forgetting Docker**: Always check `docker compose up -d` before running tests.
- **ESM Issues**: Ensure `"type": "module"` is respected. Use `.js` extensions in relative imports if needed.
- **Missing Await**: All DB and Hocuspocus hooks are async. Missing `await` leads to race conditions.
- **Direct SQL**: Avoid raw SQL unless absolutely necessary; use Drizzle API.
