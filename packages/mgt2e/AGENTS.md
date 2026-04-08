# MGT2E (Sci-Fi TTRPG Game Data)

## OVERVIEW

Static data tables and TypeScript types for sci-fi TTRPG character generation and gameplay. Used by web frontend for character creation workflows.

## STRUCTURE

```
src/
├── types/          # TypeScript interfaces
│   ├── career.ts   # CareerDefinition, CareerAssignment, CareerRank
│   ├── skill.ts    # Skill definitions and specialties
│   ├── event.ts    # CareerEvent, CareerMishap
│   ├── benefit.ts  # Mustering out benefits
│   ├── term.ts     # Career term tracking
│   └── characteristic.ts  # STR/DEX/END/INT/EDU/SOC
├── data/           # Static game data
│   ├── skills.ts   # Master skill list
│   └── careers/    # 12 CRB careers (agent, navy, scout, etc.)
└── tables/         # Roll tables
    ├── dice.ts     # Dice rolling utilities
    ├── events.ts   # Life event tables
    └── benefits.ts # Mustering out tables
```

## KEY TYPES

| Type               | Location              | Role                                                  |
| ------------------ | --------------------- | ----------------------------------------------------- |
| `CareerDefinition` | types/career.ts       | Full career with assignments, skills, ranks, benefits |
| `CareerAssignment` | types/career.ts       | Career branch (e.g., Army: Marine, Support)           |
| `SkillTableEntry`  | types/career.ts       | Roll → skill mapping                                  |
| `CrbCareerId`      | data/careers/index.ts | Union type of valid career IDs                        |

## KEY EXPORTS

```typescript
import {
  CAREERS,           // Record<string, CareerDefinition>
  getCareer(id),     // Get single career
  getAllCareers(),   // Get all careers array
  CRB_CAREER_IDS,    // Type-safe career ID list
  CrbCareerId        // 'agent' | 'army' | ... | 'scout'
} from '@highport/mgt2e';
```

## CONVENTIONS

- **Roll indexing**: Table entries use 0-indexed arrays (roll 1 = index 0)
- **Characteristic codes**: Use `CharacteristicCode` type ('STR', 'DEX', etc.)
- **Career IDs**: Lowercase kebab-case matching CRB names

## ANTI-PATTERNS

- **Do NOT** hardcode career IDs - use `CrbCareerId` type
- **Do NOT** import from internal paths - use `@highport/mgt2e`
- **Do NOT** modify career data at runtime - it's static

## USAGE IN WEB

Character generation (`apps/web/lib/chargen/`) consumes these types:

- `CareerDefinition` drives the career selection UI
- `SkillTableEntry` powers skill roll dialogs
- `BenefitEntry` handles mustering out flow
