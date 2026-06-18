# Highport Shared

> The common tongue of the fleet.

Shared TypeScript types, utilities, and constants used across the Highport monorepo. Imported by `apps/web`, `apps/server`, and other workspace packages.

## Subsystem Status

v0.1 — stable. Types are kept in sync as the web and server evolve.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process

## Usage

Import from the workspace package:

```ts
import { GraphNode, GraphEdge } from '@highport/shared';
import { sanitizeText } from '@highport/shared/utils/text';
```

## Building

```bash
pnpm --filter @highport/shared build   # emits to dist/
```

The build runs automatically via Turborepo when downstream apps build.

## Architecture Notes

- `src/types/` - core type definitions (GraphNode, GraphEdge, Campaign, etc.)
- `src/utils/` - shared utilities (text, validation, ID generation)
- `src/constants.ts` - shared constants (node types, edge types, default values)
- `src/index.ts` - public API barrel export

No environment variables. Pure library, no runtime/CLI.

## License

MIT - see [root LICENSE](../../LICENSE).
