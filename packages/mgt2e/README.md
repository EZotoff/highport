# Highport MGT2E Game Data

> The starship library computer.

Mongoose Traveller 2e game-data plugin for Highport. Provides career, skill, and equipment types plus a loader for external data packs. Ships only minimal starter content (the "Drifter" career); users supply the full CRB via an external data directory.

## Subsystem Status

v0.1, stable. Loader and types are public API; starter content is intentionally minimal.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process

## Usage

```ts
import { loadGameData, Career, Skill } from '@highport/mgt2e';
const data = await loadGameData(); // reads GAME_DATA_DIR if set
```

## Building

```bash
pnpm --filter @highport/mgt2e build   # emits to dist/
```

## Key Environment Variables

| Variable        | Purpose                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| `GAME_DATA_DIR` | Path to an external data pack (overrides the built-in starter content). Optional. |

## Architecture Notes

- `src/types/` - career, skill, equipment, and character types
- `src/data/` - built-in starter content (Drifter career, skill names/metadata only)
- `src/tables/` - mechanics tables (mustering out, advancement, survival)
- `src/loader.ts` - resolves data from `GAME_DATA_DIR` or falls back to starter content

Descriptions in starter content are generic to avoid reproducing copyrighted text. Users supply full game-system content via `GAME_DATA_DIR`.

## License

MIT - see [root LICENSE](../../LICENSE). Game-system data loaded via `GAME_DATA_DIR` is the user's responsibility to license.
