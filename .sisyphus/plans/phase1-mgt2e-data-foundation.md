# Phase 1: MGT2e Data Foundation - Implementation Plan

> **Status**: READY FOR EXECUTION
> **Run with**: `/start-work`
> **Estimated effort**: 2-3 hours

---

## Overview

This plan creates the `@planeshift/mgt2e` package containing:
1. TypeScript types for MGT2e skills, careers, events, and benefits
2. Extracted skill data from the Foundry MGT2e module
3. CRB career definitions with survival/advancement rolls
4. Event and mishap tables for each career
5. Dice roller utility with seeded randomness

---

## Task Breakdown

### Task 1: Create Package Structure

**Files to create:**
```
packages/mgt2e/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── characteristic.ts # STR, DEX, END, INT, EDU, SOC
│   │   ├── skill.ts          # Skill definitions
│   │   ├── career.ts         # Career definitions
│   │   ├── event.ts          # Events and mishaps
│   │   ├── benefit.ts        # Mustering out benefits
│   │   └── term.ts           # Career term state
│   ├── data/
│   │   ├── index.ts          # Data exports
│   │   ├── skills.ts         # All MGT2e skills
│   │   └── careers/
│   │       ├── index.ts      # Career registry
│   │       ├── navy.ts       # Navy career
│   │       ├── army.ts       # Army career
│   │       ├── marines.ts    # Marines career
│   │       ├── merchant.ts   # Merchant career
│   │       ├── scout.ts      # Scout career
│   │       ├── agent.ts      # Agent career
│   │       ├── drifter.ts    # Drifter career
│   │       ├── entertainer.ts # Entertainer career
│   │       ├── noble.ts      # Noble career
│   │       ├── rogue.ts      # Rogue career
│   │       ├── scholar.ts    # Scholar career
│   │       └── citizen.ts    # Citizen career
│   └── tables/
│       ├── index.ts          # Table exports
│       ├── dice.ts           # Dice roller
│       ├── events.ts         # Event table lookups
│       └── benefits.ts       # Benefit table lookups
```

---

### Task 2: Define Core Types

#### `src/types/characteristic.ts`
```typescript
export type CharacteristicCode = 'STR' | 'DEX' | 'END' | 'INT' | 'EDU' | 'SOC' | 'PSI';

export interface CharacteristicSet {
  STR: number;
  DEX: number;
  END: number;
  INT: number;
  EDU: number;
  SOC: number;
  PSI?: number;
}

export function getCharacteristicModifier(value: number): number {
  if (value <= 0) return -3;
  if (value <= 2) return -2;
  if (value <= 5) return -1;
  if (value <= 8) return 0;
  if (value <= 11) return 1;
  if (value <= 14) return 2;
  return 3;
}
```

#### `src/types/skill.ts`
```typescript
export interface SkillDefinition {
  id: string;
  name: string;
  defaultCharacteristic: CharacteristicCode;
  background: boolean;        // Can be taken during background phase
  combat: boolean;            // Is a combat skill
  psionic: boolean;           // Requires PSI
  specialties?: SkillSpecialty[];
}

export interface SkillSpecialty {
  id: string;
  name: string;
  defaultCharacteristic?: CharacteristicCode;  // Override parent if different
  combat?: boolean;
}

export interface CharacterSkill {
  skillId: string;
  specialtyId?: string;
  level: number;
}
```

#### `src/types/career.ts`
```typescript
export interface CareerDefinition {
  id: string;
  name: string;
  description: string;
  
  // Qualification
  qualification: {
    characteristic: CharacteristicCode;
    target: number;
    previousCareerPenalty?: number;  // DM per previous career (usually -1)
  };
  
  // Assignments within the career
  assignments: CareerAssignment[];
  
  // Skill tables (shared across assignments)
  skillTables: {
    personal: SkillTableEntry[];
    service: SkillTableEntry[];
    advanced: SkillTableEntry[];
    officer?: SkillTableEntry[];   // Only for military careers with commission
  };
  
  // Rank structure
  ranks: CareerRank[];
  officerRanks?: CareerRank[];  // Separate officer track
  
  // Benefits
  cashBenefits: number[];       // 1-6 on cash table
  benefitTable: BenefitEntry[]; // 1-6 on benefits table
  
  // Events and mishaps
  events: CareerEvent[];        // 2-12 on 2d6
  mishaps: CareerMishap[];      // 1-6 on 1d6
}

export interface CareerAssignment {
  id: string;
  name: string;
  description: string;
  survival: {
    characteristic: CharacteristicCode;
    target: number;
  };
  advancement: {
    characteristic: CharacteristicCode;
    target: number;
  };
  skillTable: SkillTableEntry[];  // Assignment-specific skill table
}

export interface CareerRank {
  rank: number;
  title: string;
  skill?: string;       // Automatic skill gain at this rank
  skillLevel?: number;  // Level of automatic skill
  benefit?: string;     // Non-skill benefit (e.g., "TAS Membership")
}

export interface SkillTableEntry {
  roll: number;          // 1-6 on 1d6
  skill: string;         // Skill ID or "+1 [characteristic]"
  specialty?: string;    // Specialty if skill has specialties
}
```

#### `src/types/event.ts`
```typescript
export interface CareerEvent {
  roll: number;           // 2-12 on 2d6
  description: string;    // Base event text from CRB
  
  // What this event can spawn
  spawns?: EventSpawn[];
  
  // Mechanical effects
  effects?: EventEffect[];
  
  // Choices for the player
  choices?: EventChoice[];
}

export interface EventSpawn {
  type: 'npc' | 'location' | 'item' | 'secret';
  relationship?: 'ally' | 'contact' | 'rival' | 'enemy';
  template?: string;       // AI prompt template for generation
  required: boolean;       // Must player provide details?
}

export interface EventEffect {
  type: 'skill' | 'characteristic' | 'benefit' | 'special';
  target: string;          // Skill/characteristic/benefit ID
  value: number | string;  // +1, -1, or special value
  condition?: string;      // "if player chooses X"
}

export interface EventChoice {
  id: string;
  description: string;
  effects: EventEffect[];
}

export interface CareerMishap {
  roll: number;            // 1-6 on 1d6
  description: string;
  injury: boolean;         // Does this cause injury roll?
  effects?: EventEffect[];
  forced: boolean;         // Must leave career after this?
}
```

#### `src/types/term.ts`
```typescript
// State for a single career term during chargen
export interface CareerTerm {
  termNumber: number;
  careerId: string;
  assignmentId: string;
  age: number;           // Age at start of term
  
  // Rolls made this term
  survivalRoll?: DiceResult;
  eventRoll?: DiceResult;
  advancementRoll?: DiceResult;
  commissionRoll?: DiceResult;
  
  // Outcomes
  survived: boolean;
  mishap?: CareerMishap;
  event?: CareerEvent;
  promoted: boolean;
  commissioned?: boolean;
  rankGained?: number;
  
  // Skills/benefits gained
  skillsGained: CharacterSkill[];
  benefitsGained: string[];
  
  // Entities spawned from events
  spawnedEntities: SpawnedEntity[];
}

export interface DiceResult {
  dice: string;          // e.g., "2d6"
  rolls: number[];       // Individual die results
  total: number;         // Sum
  modifier: number;      // DM applied
  target?: number;       // Target number if applicable
  success?: boolean;     // If checking against target
}

export interface SpawnedEntity {
  type: 'npc' | 'location' | 'item' | 'secret';
  id: string;            // Generated UUID
  relationship?: string;
  name?: string;
  description?: string;
  // Additional fields added during AI generation
  [key: string]: unknown;
}
```

---

### Task 3: Extract Skills Data

From `/tmp/mgt2e/mgt2e/module/helpers/config.mjs` (lines 554-828), create:

#### `src/data/skills.ts`
```typescript
import type { SkillDefinition } from '../types/skill.js';

export const SKILLS: Record<string, SkillDefinition> = {
  admin: {
    id: 'admin',
    name: 'Admin',
    defaultCharacteristic: 'EDU',
    background: true,
    combat: false,
    psionic: false,
  },
  advocate: {
    id: 'advocate',
    name: 'Advocate',
    defaultCharacteristic: 'EDU',
    background: false,
    combat: false,
    psionic: false,
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    defaultCharacteristic: 'INT',
    background: true,
    combat: false,
    psionic: false,
    specialties: [
      { id: 'handling', name: 'Handling', defaultCharacteristic: 'DEX' },
      { id: 'veterinary', name: 'Veterinary', defaultCharacteristic: 'EDU' },
      { id: 'training', name: 'Training', defaultCharacteristic: 'INT' },
    ],
  },
  // ... (all 40+ skills from config.mjs)
};

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILLS[id];
}

export function getBackgroundSkills(): SkillDefinition[] {
  return Object.values(SKILLS).filter(s => s.background);
}

export function getCombatSkills(): SkillDefinition[] {
  return Object.values(SKILLS).filter(s => s.combat || s.specialties?.some(sp => sp.combat));
}
```

---

### Task 4: Define CRB Careers

Create one file per career. Example for Navy:

#### `src/data/careers/navy.ts`
```typescript
import type { CareerDefinition } from '../../types/career.js';

export const NAVY: CareerDefinition = {
  id: 'navy',
  name: 'Navy',
  description: 'Members of the interstellar navy which patrols space between the stars.',
  
  qualification: {
    characteristic: 'INT',
    target: 6,
    previousCareerPenalty: -1,
  },
  
  assignments: [
    {
      id: 'line-crew',
      name: 'Line/Crew',
      description: 'You serve as a general crewman or junior officer on a starship.',
      survival: { characteristic: 'INT', target: 5 },
      advancement: { characteristic: 'EDU', target: 7 },
      skillTable: [
        { roll: 1, skill: 'electronics', specialty: 'comms' },
        { roll: 2, skill: 'mechanic' },
        { roll: 3, skill: 'guncombat', specialty: 'slug' },
        { roll: 4, skill: 'flyer' },
        { roll: 5, skill: 'melee', specialty: 'blade' },
        { roll: 6, skill: 'vaccsuit' },
      ],
    },
    {
      id: 'engineering-gunnery',
      name: 'Engineering/Gunnery',
      description: 'You serve as a gunner or engineer on a starship.',
      survival: { characteristic: 'INT', target: 6 },
      advancement: { characteristic: 'EDU', target: 6 },
      skillTable: [
        { roll: 1, skill: 'engineer', specialty: 'power' },
        { roll: 2, skill: 'engineer', specialty: 'mDrive' },
        { roll: 3, skill: 'engineer', specialty: 'jDrive' },
        { roll: 4, skill: 'gunner', specialty: 'turret' },
        { roll: 5, skill: 'gunner', specialty: 'ortillery' },
        { roll: 6, skill: 'gunner', specialty: 'capital' },
      ],
    },
    {
      id: 'flight',
      name: 'Flight',
      description: 'You are a pilot of a shuttle or fighter.',
      survival: { characteristic: 'DEX', target: 7 },
      advancement: { characteristic: 'EDU', target: 5 },
      skillTable: [
        { roll: 1, skill: 'pilot', specialty: 'smallCraft' },
        { roll: 2, skill: 'flyer' },
        { roll: 3, skill: 'gunner' },
        { roll: 4, skill: 'pilot', specialty: 'spacecraft' },
        { roll: 5, skill: 'electronics', specialty: 'sensors' },
        { roll: 6, skill: 'astrogation' },
      ],
    },
  ],
  
  skillTables: {
    personal: [
      { roll: 1, skill: '+1 STR' },
      { roll: 2, skill: '+1 DEX' },
      { roll: 3, skill: '+1 END' },
      { roll: 4, skill: '+1 INT' },
      { roll: 5, skill: '+1 EDU' },
      { roll: 6, skill: '+1 SOC' },
    ],
    service: [
      { roll: 1, skill: 'pilot' },
      { roll: 2, skill: 'vaccsuit' },
      { roll: 3, skill: 'athletics' },
      { roll: 4, skill: 'gunner' },
      { roll: 5, skill: 'mechanic' },
      { roll: 6, skill: 'guncombat' },
    ],
    advanced: [
      { roll: 1, skill: 'electronics' },
      { roll: 2, skill: 'astrogation' },
      { roll: 3, skill: 'engineer' },
      { roll: 4, skill: 'drive' },
      { roll: 5, skill: 'navigation' },
      { roll: 6, skill: 'admin' },
    ],
    officer: [
      { roll: 1, skill: 'leadership' },
      { roll: 2, skill: 'electronics' },
      { roll: 3, skill: 'pilot' },
      { roll: 4, skill: 'melee', specialty: 'blade' },
      { roll: 5, skill: 'admin' },
      { roll: 6, skill: 'tactics', specialty: 'naval' },
    ],
  },
  
  ranks: [
    { rank: 0, title: 'Crewman' },
    { rank: 1, title: 'Able Spacehand', skill: 'mechanic', skillLevel: 1 },
    { rank: 2, title: 'Petty Officer, 3rd class', skill: 'vaccsuit', skillLevel: 1 },
    { rank: 3, title: 'Petty Officer, 2nd class' },
    { rank: 4, title: 'Petty Officer, 1st class', skill: '+1 END' },
    { rank: 5, title: 'Chief Petty Officer' },
    { rank: 6, title: 'Master Chief' },
  ],
  
  officerRanks: [
    { rank: 0, title: 'Ensign', skill: 'melee', skillLevel: 1 },
    { rank: 1, title: 'Sublieutenant', skill: 'leadership', skillLevel: 1 },
    { rank: 2, title: 'Lieutenant' },
    { rank: 3, title: 'Commander', skill: 'tactics', skillLevel: 1 },
    { rank: 4, title: 'Captain' },
    { rank: 5, title: 'Admiral', skill: '+1 SOC' },
    { rank: 6, title: 'Fleet Admiral' },
  ],
  
  cashBenefits: [1000, 5000, 10000, 10000, 20000, 50000, 50000],
  
  benefitTable: [
    { roll: 1, benefit: 'Personal Vehicle' },
    { roll: 2, benefit: '+1 INT' },
    { roll: 3, benefit: '+1 EDU', orHighRank: 'TAS Membership' },
    { roll: 4, benefit: 'Weapon' },
    { roll: 5, benefit: 'Ship Share', orHighRank: '+2 Ship Shares' },
    { roll: 6, benefit: '+1 SOC', orHighRank: 'Yacht' },
  ],
  
  events: [
    {
      roll: 2,
      description: 'Disaster! Roll on the Mishap table but you are not ejected from this career.',
      effects: [{ type: 'special', target: 'mishap', value: 'roll' }],
    },
    {
      roll: 3,
      description: 'You are given a special assignment. Gain DM+1 to any one Benefit roll.',
      effects: [{ type: 'benefit', target: 'dm', value: 1 }],
    },
    {
      roll: 4,
      description: 'You are assigned to an assault on an enemy fortress.',
      choices: [
        {
          id: 'assault-join',
          description: 'Join the assault',
          effects: [
            { type: 'special', target: 'roll', value: 'Gun Combat or Melee 8+' },
            { type: 'skill', target: 'tactics', value: 1, condition: 'success' },
          ],
        },
        {
          id: 'assault-support',
          description: 'Provide support',
          effects: [{ type: 'skill', target: 'engineer', value: 1 }],
        },
      ],
    },
    {
      roll: 5,
      description: 'You are given advanced training in a specialist field.',
      effects: [{ type: 'special', target: 'training', value: 'EDU 8+ for skill' }],
    },
    {
      roll: 6,
      description: 'Your vessel participates in a notable military engagement.',
      spawns: [
        { type: 'location', required: false, template: 'battle_location' },
      ],
      effects: [{ type: 'special', target: 'roll', value: 'Pilot/Gunner/Engineer' }],
    },
    {
      roll: 7,
      description: 'Life Event. Roll on the Life Events table.',
      effects: [{ type: 'special', target: 'life_event', value: 'roll' }],
    },
    {
      roll: 8,
      description: 'Your vessel participates in a diplomatic mission.',
      spawns: [
        { type: 'npc', relationship: 'contact', required: false, template: 'diplomat_contact' },
      ],
      choices: [
        {
          id: 'diplomacy',
          description: 'Gain Diplomat or Carouse',
          effects: [{ type: 'skill', target: 'diplomat|carouse', value: 1 }],
        },
      ],
    },
    {
      roll: 9,
      description: 'You foil an attempted crime on board, such as mutiny, sabotage, or conspiracy.',
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'criminal_enemy' },
      ],
      effects: [{ type: 'special', target: 'advancement', value: 'dm+2' }],
    },
    {
      roll: 10,
      description: 'You are befriended by a senior officer.',
      spawns: [
        { type: 'npc', relationship: 'ally', required: true, template: 'senior_officer_ally' },
      ],
      choices: [
        {
          id: 'mentor-skill',
          description: 'Gain one of Tactics (naval) or Admin',
          effects: [{ type: 'skill', target: 'tactics.naval|admin', value: 1 }],
        },
      ],
    },
    {
      roll: 11,
      description: 'You display heroism in battle, saving the whole ship.',
      effects: [
        { type: 'special', target: 'promotion', value: 'automatic' },
        { type: 'special', target: 'commission', value: 'if_not_officer' },
      ],
    },
    {
      roll: 12,
      description: 'You gain a commission or are automatically promoted.',
      effects: [{ type: 'special', target: 'promotion', value: 'automatic' }],
    },
  ],
  
  mishaps: [
    {
      roll: 1,
      description: 'Severely injured in action. Roll twice on the Injury table and take the lower result.',
      injury: true,
      forced: true,
      effects: [{ type: 'special', target: 'injury', value: 'severe' }],
    },
    {
      roll: 2,
      description: 'Placed in the frozen watch and revived when your ship arrives in-Loss of one term.',
      forced: true,
      injury: false,
    },
    {
      roll: 3,
      description: 'During a battle, defeat or loss. Gain one of Pilot, Tactics, or Leadership.',
      forced: true,
      injury: false,
      effects: [{ type: 'skill', target: 'pilot|tactics|leadership', value: 1 }],
    },
    {
      roll: 4,
      description: 'Blamed for an accident. Roll SOC 8+ to stay.',
      forced: false,
      injury: false,
      effects: [{ type: 'special', target: 'check', value: 'SOC 8+' }],
    },
    {
      roll: 5,
      description: 'You are tormented by a cruel officer, who drives you out.',
      forced: true,
      injury: false,
      spawns: [
        { type: 'npc', relationship: 'enemy', required: true, template: 'cruel_officer' },
      ],
    },
    {
      roll: 6,
      description: 'Injured. Roll on the Injury table.',
      forced: true,
      injury: true,
    },
  ],
};
```

---

### Task 5: Create Dice Roller

#### `src/tables/dice.ts`
```typescript
export interface DiceResult {
  dice: string;
  rolls: number[];
  total: number;
  modifier: number;
  target?: number;
  success?: boolean;
}

// Simple seedable PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let rng: () => number = Math.random;

export function setRandomSeed(seed: number): void {
  rng = mulberry32(seed);
}

export function resetRandomSeed(): void {
  rng = Math.random;
}

export function rollDie(sides: number = 6): number {
  return Math.floor(rng() * sides) + 1;
}

export function roll(dice: string, modifier: number = 0, target?: number): DiceResult {
  const match = dice.match(/^(\d+)?d(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: ${dice}`);
  }
  
  const count = parseInt(match[1] || '1', 10);
  const sides = parseInt(match[2], 10);
  
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  
  return {
    dice,
    rolls,
    total,
    modifier,
    target,
    success: target !== undefined ? total >= target : undefined,
  };
}

// Convenience functions
export function roll2d6(modifier: number = 0, target?: number): DiceResult {
  return roll('2d6', modifier, target);
}

export function roll1d6(modifier: number = 0): DiceResult {
  return roll('1d6', modifier);
}

export function rollD66(): number {
  return rollDie(6) * 10 + rollDie(6);
}

export function rollCharacteristic(): number {
  return roll2d6().total;
}
```

---

### Task 6: Create Event/Benefit Table Lookups

#### `src/tables/events.ts`
```typescript
import type { CareerEvent, CareerMishap } from '../types/event.js';
import type { CareerDefinition } from '../types/career.js';
import { roll2d6, roll1d6 } from './dice.js';

export function rollCareerEvent(career: CareerDefinition): {
  roll: DiceResult;
  event: CareerEvent;
} {
  const result = roll2d6();
  const event = career.events.find(e => e.roll === result.total);
  
  if (!event) {
    throw new Error(`No event found for roll ${result.total} in career ${career.id}`);
  }
  
  return { roll: result, event };
}

export function rollMishap(career: CareerDefinition): {
  roll: DiceResult;
  mishap: CareerMishap;
} {
  const result = roll1d6();
  const mishap = career.mishaps.find(m => m.roll === result.total);
  
  if (!mishap) {
    throw new Error(`No mishap found for roll ${result.total} in career ${career.id}`);
  }
  
  return { roll: result, mishap };
}
```

#### `src/tables/benefits.ts`
```typescript
import type { CareerDefinition } from '../types/career.js';
import { roll1d6 } from './dice.js';

export interface BenefitRollResult {
  roll: DiceResult;
  cash?: number;
  benefit?: string;
}

export function rollCashBenefit(
  career: CareerDefinition,
  gamblingBonus: number = 0
): BenefitRollResult {
  const result = roll1d6(gamblingBonus);
  const index = Math.min(result.total, career.cashBenefits.length) - 1;
  const cash = career.cashBenefits[index];
  
  return { roll: result, cash };
}

export function rollMusteringBenefit(
  career: CareerDefinition,
  modifier: number = 0,
  isHighRank: boolean = false
): BenefitRollResult {
  const result = roll1d6(modifier);
  const index = Math.min(result.total, career.benefitTable.length) - 1;
  const entry = career.benefitTable[index];
  
  const benefit = isHighRank && entry.orHighRank 
    ? entry.orHighRank 
    : entry.benefit;
  
  return { roll: result, benefit };
}
```

---

### Task 7: Create Index Files

#### `src/types/index.ts`
```typescript
export * from './characteristic.js';
export * from './skill.js';
export * from './career.js';
export * from './event.js';
export * from './benefit.js';
export * from './term.js';
```

#### `src/data/index.ts`
```typescript
export * from './skills.js';
export * from './careers/index.js';
```

#### `src/data/careers/index.ts`
```typescript
import type { CareerDefinition } from '../../types/career.js';
import { NAVY } from './navy.js';
import { ARMY } from './army.js';
// ... other imports

export const CAREERS: Record<string, CareerDefinition> = {
  navy: NAVY,
  army: ARMY,
  // ... other careers
};

export function getCareer(id: string): CareerDefinition | undefined {
  return CAREERS[id];
}

export function getAllCareers(): CareerDefinition[] {
  return Object.values(CAREERS);
}

// CRB career IDs for reference
export const CRB_CAREER_IDS = [
  'agent',
  'army',
  'citizen',
  'drifter',
  'entertainer',
  'marines',
  'merchant',
  'navy',
  'noble',
  'rogue',
  'scholar',
  'scout',
] as const;

export type CrbCareerId = typeof CRB_CAREER_IDS[number];
```

#### `src/tables/index.ts`
```typescript
export * from './dice.js';
export * from './events.js';
export * from './benefits.js';
```

#### `src/index.ts`
```typescript
// Main package exports
export * from './types/index.js';
export * from './data/index.js';
export * from './tables/index.js';
```

---

### Task 8: Add to Workspace

Update `pnpm-workspace.yaml` if needed:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Update root `package.json` to include mgt2e in build order if needed.

---

## Verification Checklist

After implementation, verify:

- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @planeshift/mgt2e build` compiles without errors
- [ ] `pnpm --filter @planeshift/mgt2e typecheck` passes
- [ ] Types are exported correctly:
  ```typescript
  import { CareerDefinition, SKILLS, roll2d6 } from '@planeshift/mgt2e';
  ```
- [ ] All 12 CRB careers defined with correct data
- [ ] Dice roller produces valid results
- [ ] Event/mishap tables return correct entries

---

## Notes for Implementation

### Skills Extraction
The full skill list is in `/tmp/mgt2e/mgt2e/module/helpers/config.mjs` lines 554-828. Transform this JavaScript object into TypeScript with proper typing.

### Career Data Source
The CRB careers are NOT in the free Foundry module (they're licensed content). You'll need to define them manually based on the Core Rulebook tables:
- Pages 16-43 (Careers)
- Pages 44-49 (Benefits, Aging, etc.)

### Event Entity Spawning
The `spawns` array on events identifies what graph entities should be created. The `template` field references AI prompt templates that will be used in Phase A3 to generate rich descriptions.

---

## Dependencies

This phase has NO dependencies on other parts of the codebase. It creates a standalone data package.

## Blocks

Completing this phase unblocks:
- Phase A2: Single-Player Chargen Flow
- Chunk B: Extended Foundry Sync (needs skill types)
