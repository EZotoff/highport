# Highport MGT2E Game Data

> The starship library computer.

Mongoose Traveller 2e game-data plugin for Highport. Provides career, skill, and equipment types plus a loader for external data packs. All 12 MGT2E Core Rulebook careers ship in-repo with paraphrased descriptions; users can still supply custom data via `GAME_DATA_DIR`.

## Subsystem Status

v0.1, stable. Loader and types are public API; all 12 CRB careers are included in-repo.

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

| Variable        | Purpose                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| `GAME_DATA_DIR` | Path to an external data pack (overrides the built-in careers). Optional. |

## Architecture Notes

- `src/types/` - career, skill, equipment, and character types
- `src/data/` - built-in career data (all 12 MGT2E CRB careers, 44 core skills)
- `src/tables/` - mechanics tables (mustering out, advancement, survival)
- `src/loader.ts` - resolves data from `GAME_DATA_DIR` or falls back to built-in careers

Career descriptions are paraphrased to respect Mongoose Publishing's proprietary content. Mechanical data (die targets, skill tables, ranks, benefits, events, mishaps) is drawn from the MGT2E Core Rulebook. Users can still supply full game-system content via `GAME_DATA_DIR`.

## License

MIT - see [root LICENSE](../../LICENSE). Game-system data loaded via `GAME_DATA_DIR` is the user's responsibility to license. Built-in career mechanical data is derived from the MGT2E Core Rulebook; creative text is paraphrased.
