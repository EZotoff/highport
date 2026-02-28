# SERVER (Fastify + Hocuspocus)

## OVERVIEW

Backend for Highport. Handles WebSocket sync via Hocuspocus and REST API via Fastify. Persists Y.Doc state to PostgreSQL.

## STRUCTURE

- `src/index.ts` - Server entry point
- `src/api/` - Fastify REST routes
- `src/ws/` - Hocuspocus WebSocket server
- `src/db/` - Drizzle ORM schema and client
- `src/jobs/` - Background jobs (e.g., compaction)

## KEY MODULES

| File                   | Role                               |
| ---------------------- | ---------------------------------- |
| `src/ws/hocuspocus.ts` | WebSocket server for Yjs sync      |
| `src/db/schema.ts`     | Drizzle schema for documents table |
| `src/db/client.ts`     | Database connection pool           |
| `src/api/index.ts`     | REST API endpoints                 |

## HOCUSPOCUS PATTERNS

- **Configuration**: Server listens on port 3011. Configured in `src/ws/hocuspocus.ts`.
- **Persistence**: Uses `DatabaseExtension` to save Y.Doc updates to PostgreSQL `documents` table.
- **Hooks**:
  - `onConnect`: Validates auth token (future) and logs connection.
  - `onDisconnect`: Cleans up transient state if needed.
  - `onStoreDocument`: Debounced write to DB to prevent thrashing.
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

1. Ensure server is running (port 3012)
2. Test happy path:
   ```bash
   curl -X GET http://localhost:3012/health
   curl -X POST http://localhost:3012/api/documents -d '...'
   ```
3. Test error cases: 400, 401, 404, 500
4. Document response schemas

### WebSocket Verification

1. Connect to ws://localhost:3011
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

- **Fastify**: Use `setErrorHandler` in `src/index.ts` to catch global errors.
- **Status Codes**:
  - 400: Validation error (zod parsing failed)
  - 404: Resource not found
  - 500: Internal server error (log stack trace)
- **Logging**: Use structured logging (pino). Do not log sensitive data.

## ANTI-PATTERNS

- **Forgetting Docker**: Always check `docker compose up -d` before running tests.
- **ESM Issues**: Ensure `"type": "module"` is respected. Use `.js` extensions in relative imports if needed.
- **Missing Await**: All DB and Hocuspocus hooks are async. Missing `await` leads to race conditions.
- **Direct SQL**: Avoid raw SQL unless absolutely necessary; use Drizzle API.
