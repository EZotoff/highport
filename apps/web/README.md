# Highport Web

> The forward viewport of your campaign bridge.

The Next.js 14 frontend renders the interactive graph, real-time tables, and character sheets. It connects to the Hocuspocus sync server and uses IndexedDB for offline persistence.

## Subsystem Status

v0.1. Core graph and character generation shipped. AI chat requires the RAG service.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process
- [.env.example](./.env.example) - environment variables

## Running Locally

```bash
# From repo root
pnpm install
docker compose up -d
pnpm --filter web dev   # port 18120
```

## Key Environment Variables

| Variable             | Purpose                       |
| -------------------- | ----------------------------- |
| `NEXT_PUBLIC_WS_URL` | Hocuspocus WebSocket endpoint |
| `AUTH_SECRET`        | NextAuth secret               |

See [.env.example](./.env.example) for the full list.

## Testing

```bash
pnpm --filter web test   # Vitest
pnpm --filter web e2e    # Playwright
```

## Architecture Notes

- App Router pages under `app/`, React components in `components/`.
- `lib/sync.ts` holds the singleton `HocuspocusProvider`.
- Real-time state via `Y.Map` and `Y.Array`. See `lib/yjs-helpers.ts`.
- `lib/ydoc.ts` defines the shared document schema.

## License

MIT - see [root LICENSE](../../LICENSE).
