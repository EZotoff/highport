# MGT2E (Sci-Fi TTRPG Game Data)

## OVERVIEW

Built-in and externally loadable game data plus TypeScript types for sci-fi TTRPG character generation and gameplay. Used by the web frontend for character creation workflows.

## STRUCTURE

```
src/
├── loader.ts         # Built-in and external game-data loader
├── types/          # TypeScript interfaces
│   ├── career.ts   # CareerDefinition, CareerAssignment, CareerRank
│   ├── skill.ts    # Skill definitions and specialties
│   ├── event.ts    # CareerEvent, CareerMishap
│   ├── benefit.ts  # Mustering out benefits
│   ├── term.ts     # Career term tracking
│   └── characteristic.ts  # STR/DEX/END/INT/EDU/SOC
├── data/           # Static game data
│   ├── skills.ts   # Public re-exports for loaded skill data
│   ├── careers/    # Public re-exports for loaded career data
│   └── srd/        # Built-in skills and 12 CRB careers
└── tables/         # Roll tables
    ├── dice.ts     # Dice rolling utilities
    ├── events.ts   # Life event tables
    └── benefits.ts # Mustering out tables
```

## KEY TYPES

| Type               | Location        | Role                                                  |
| ------------------ | --------------- | ----------------------------------------------------- |
| `CareerDefinition` | types/career.ts | Full career with assignments, skills, ranks, benefits |
| `CareerAssignment` | types/career.ts | Career branch (e.g., Army: Marine, Support)           |
| `SkillTableEntry`  | types/career.ts | Roll → skill mapping                                  |
| `CrbCareerId`      | loader.ts       | String alias for career IDs                           |

## KEY EXPORTS

```typescript
import {
  CAREERS, // Record<string, CareerDefinition>
  getCareer, // Get single career
  getAllCareers, // Get all careers array
  CRB_CAREER_IDS, // Built-in SRD baseline career IDs
  type CrbCareerId, // String alias for a career ID
} from '@highport/mgt2e';
```

## CONVENTIONS

- **Roll indexing**: Table entries use 0-indexed arrays (roll 1 = index 0)
- **Characteristic codes**: Use `CharacteristicCode` type ('STR', 'DEX', etc.)
- **Career IDs**: Lowercase kebab-case matching CRB names

## ANTI-PATTERNS

- **Do NOT** hardcode career IDs - use the loader's career ID helpers
- **Do NOT** import from internal `src/` paths - use `@highport/mgt2e` or its public subpath exports
- **Do NOT** mutate `CAREERS` or `SKILLS` directly - install data through the loader API

## USAGE IN WEB

Character generation (`apps/web/lib/chargen/`) consumes these types:

- `CareerDefinition` drives the career selection UI
- `SkillTableEntry` powers skill roll dialogs
- `BenefitEntry` handles mustering out flow
