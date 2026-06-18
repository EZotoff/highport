# Highport Server

> The power and distribution grid of the campaign bridge.

The Fastify + Hocuspocus backend provides the REST API for campaigns and users, plus the WebSocket server that powers real-time Yjs CRDT sync. Document state is persisted to PostgreSQL via Drizzle ORM.

## Subsystem Status

v0.1. Auth, campaigns, documents, and portrait generation are shipped.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process
- [.env.example](./.env.example) - environment variables

## Running Locally

```bash
# From repo root
pnpm install
docker compose up -d
pnpm --filter server dev   # Hocuspocus 18121 + Fastify 18122
```

## Key Environment Variables

| Variable       | Purpose                          |
| -------------- | -------------------------------- |
| `DATABASE_URL` | PostgreSQL connection (required) |
| `AUTH_SECRET`  | NextAuth secret                  |

See [.env.example](./.env.example) for the full list.

## Testing

```bash
docker compose up -d
pnpm --filter server test
```

## Architecture Notes

- `src/ws/hocuspocus.ts` is the Yjs WebSocket server on port 18121.
- `src/api/` contains Fastify REST routes on port 18122.
- `src/db/schema.ts` is the Drizzle ORM schema. Run `db:generate` after changes, then `db:migrate`.
- `src/db/client.ts` manages the PostgreSQL connection pool.

## License

MIT - see [root LICENSE](../../LICENSE).
