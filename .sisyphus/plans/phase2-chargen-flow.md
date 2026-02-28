# Phase A2: Single-Player Chargen Flow - Implementation Plan

> **Status**: ✅ COMPLETE
> **Run with**: `/start-work`
> **Estimated effort**: 3-4 days
> **Depends on**: Phase 1 (MGT2e Data Foundation) - COMPLETE

---

## Overview

This plan implements the single-player character generation flow for Mongoose Traveller 2e. The chargen wizard:

1. Uses CRDT state for real-time sync (foundation for Phase A4 multiplayer)
2. Auto-rolls dice with seedable randomness
3. Spawns graph entities (NPCs, locations) from career events
4. Creates a final character node with full career history

---

## Architecture Decisions

### State Management

- Chargen state stored in Yjs Y.Map within the campaign document
- Separate from main graph but in same Y.Doc for atomic updates
- Structure allows multiple characters in same session (Phase A4 prep)

### UI Location

- New route: `/app/campaigns/[id]/chargen`
- Wizard-style UI with step navigation
- Character preview panel on right side

### Integration Points

- `@planeshift/mgt2e` package for career/skill data
- Existing graph CRDT for entity spawning
- Existing presence system for future multiplayer

---

## Task Breakdown

### Task 1: Chargen Route and Layout

**Effort**: Low (1-2 hours)

Create the chargen page structure:

```
apps/web/app/campaigns/[id]/chargen/
├── page.tsx              # Main chargen page
├── layout.tsx            # Chargen-specific layout (no graph sidebar)
├── components/
│   ├── ChargenWizard.tsx      # Main wizard container
│   ├── CharacterPreview.tsx   # Live preview panel
│   └── StepNavigation.tsx     # Step indicator/navigation
```

**Files to create:**

- [x] `apps/web/app/chargen/page.tsx` (created at `/chargen` route instead)
- [x] `apps/web/components/chargen/ChargenWizard.tsx`
- [x] `apps/web/components/chargen/CharacterPreview.tsx`
- [x] `apps/web/components/chargen/StepNavigation.tsx`

**Acceptance criteria:**

- [x] Route `/chargen` renders wizard shell
- [x] Preview panel shows live character data
- [x] Step navigation shows 5 steps: Background, Careers, Skills, Benefits, Finalize

---

### Task 2: Chargen CRDT State Schema

**Effort**: Medium (2-3 hours)

Define the CRDT structure for character generation:

**Files to create:**

- [x] `apps/web/lib/chargen/types.ts` - TypeScript interfaces
- [x] `apps/web/lib/chargen/state.ts` - CRDT state management
- [x] `apps/web/lib/chargen/hooks.ts` - React hooks for chargen state

**Schema (in types.ts):**

```typescript
export interface ChargenSession {
  id: string;
  campaignId: string;
  startedAt: number;
  status: 'active' | 'completed' | 'abandoned';
  characters: Map<string, ChargenCharacter>;
}

export interface ChargenCharacter {
  id: string;
  playerId: string;
  name: string;

  // Step 1: Background
  homeworld?: string;
  characteristics: CharacteristicSet;
  backgroundSkills: string[]; // 3 skills at level 0

  // Step 2: Career history
  terms: CareerTermResult[];
  currentTermIndex: number;
  status: 'background' | 'career_selection' | 'term_resolution' | 'mustering_out' | 'finalized';

  // Accumulated from terms
  skills: Record<string, number>;
  benefits: string[];
  credits: number;
  age: number;

  // Spawned entities (references to graph nodes)
  spawnedEntityIds: string[];
}

export interface CareerTermResult {
  termNumber: number;
  careerId: string;
  assignmentId: string;
  startAge: number;

  // Rolls made
  survivalRoll: DiceResult;
  survived: boolean;

  eventRoll?: DiceResult;
  event?: CareerEvent;
  eventChoice?: string; // If event had choices

  advancementRoll?: DiceResult;
  advanced: boolean;
  rankGained?: number;

  // What was gained this term
  skillsGained: Array<{ skill: string; specialty?: string; level: number }>;
  benefitRolls?: number; // Mustering out rolls earned

  // Entities spawned from event
  spawnedEntities: SpawnedEntityRef[];
}

export interface SpawnedEntityRef {
  type: 'npc' | 'location' | 'item' | 'secret';
  graphNodeId: string;
  relationship?: 'ally' | 'contact' | 'rival' | 'enemy';
  name: string;
}
```

**CRDT integration (in state.ts):**

```typescript
export function getChargenState(doc: Y.Doc): Y.Map<string, unknown> {
  return doc.getMap('chargen');
}

export function createCharacter(doc: Y.Doc, playerId: string): string {
  const chargen = getChargenState(doc);
  const charId = crypto.randomUUID();
  const character: ChargenCharacter = {
    id: charId,
    playerId,
    name: '',
    characteristics: rollInitialCharacteristics(),
    backgroundSkills: [],
    terms: [],
    currentTermIndex: 0,
    status: 'background',
    skills: {},
    benefits: [],
    credits: 0,
    age: 18,
    spawnedEntityIds: [],
  };
  chargen.set(`char:${charId}`, character);
  return charId;
}
```

**Acceptance criteria:**

- [x] Chargen state persists in Y.Doc
- [x] Character creation adds entry to chargen map
- [x] State updates sync between browser tabs

---

### Task 3: Characteristics Generation (Background Step)

**Effort**: Low (1-2 hours)

Implement the background phase:

1. Roll 2d6 for each of 6 characteristics
2. Display results with option to swap two values
3. Select 3 background skills at level 0

**Files to create:**

- [x] `apps/web/components/chargen/steps/BackgroundStep.tsx`
- [x] Characteristics logic integrated in state.ts

**BackgroundStep UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  BACKGROUND                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Characteristics (2d6 each):                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  STR: 7 (+0)   DEX: 9 (+1)   END: 8 (+0)               │ │
│  │  INT: 10 (+1)  EDU: 6 (+0)   SOC: 5 (-1)               │ │
│  └────────────────────────────────────────────────────────┘ │
│  [Re-roll All] [Swap Two Values ▼]                          │
│                                                             │
│  Background Skills (choose 3 at level 0):                   │
│  Available: Admin, Animals, Art, Athletics, Carouse,        │
│             Drive, Electronics, Flyer, Language, Mechanic,  │
│             Profession, Science, Seafarer, Steward,         │
│             Streetwise, Survival, Vacc Suit                 │
│                                                             │
│  Selected: [Admin] [Athletics] [_________▼]                 │
│                                                             │
│  [Continue to Careers →]                                    │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] Characteristics rolled with 2d6 each
- [x] Modifiers calculated and displayed correctly
- [x] Can swap any two characteristic values
- [x] Can select exactly 3 background skills
- [x] State saved to CRDT on each change

---

### Task 4: Career Selection UI

**Effort**: Medium (2-3 hours)

Show available careers and handle qualification:

**Files to create:**

- [x] `apps/web/components/chargen/steps/CareerSelectionStep.tsx`
- [x] Qualification logic integrated in CareerSelectionStep.tsx

**CareerSelectionStep UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  CAREER SELECTION - Term 1 (Age 18)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Choose a career to attempt:                                │
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ NAVY            │ │ ARMY            │ │ MARINES         ││
│  │ INT 6+          │ │ END 5+          │ │ END 6+          ││
│  │ Your DM: +1     │ │ Your DM: +0     │ │ Your DM: +0     ││
│  │ [Select]        │ │ [Select]        │ │ [Select]        ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ MERCHANT        │ │ SCOUT           │ │ AGENT           ││
│  │ INT 4+          │ │ INT 5+          │ │ INT 6+          ││
│  │ Your DM: +1     │ │ Your DM: +1     │ │ Your DM: +1     ││
│  │ [Select]        │ │ [Select]        │ │ [Select]        ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
│  ... (more careers)                                         │
│                                                             │
│  [← Back] [Become Drifter (no roll)]                        │
└─────────────────────────────────────────────────────────────┘
```

**On career selection:**

1. Auto-roll qualification (2d6 + characteristic DM - previous careers penalty)
2. If pass: proceed to assignment selection
3. If fail: offer Draft or Drifter

**Assignment selection sub-step:**

```
┌─────────────────────────────────────────────────────────────┐
│  NAVY - Choose Assignment                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ LINE/CREW                                             │   │
│  │ General crewman or junior officer on a starship       │   │
│  │ Survival: INT 5+  |  Advancement: EDU 7+              │   │
│  │ [Select]                                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ENGINEERING/GUNNERY                                   │   │
│  │ Serve as a gunner or engineer on a starship           │   │
│  │ Survival: INT 6+  |  Advancement: EDU 6+              │   │
│  │ [Select]                                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FLIGHT                                                │   │
│  │ Pilot of a shuttle or fighter                         │   │
│  │ Survival: DEX 7+  |  Advancement: EDU 5+              │   │
│  │ [Select]                                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] All 12 CRB careers displayed with qualification requirements
- [x] DM calculated from character's characteristics
- [x] Qualification roll auto-performed with result displayed
- [x] Failed qualification offers Draft/Drifter options
- [x] Assignment selection shown after qualification success

---

### Task 5: Term Resolution Flow

**Effort**: High (4-6 hours)

The core term resolution loop:

**Files to create:**

- [x] `apps/web/components/chargen/steps/TermResolutionStep.tsx`
- [x] `apps/web/lib/chargen/term-resolution.ts`

**Term flow:**

```
1. Survival Roll
   └─ Success → Continue
   └─ Failure → Mishap table → Forced out

2. Career Event (2d6)
   └─ Display event description
   └─ If event has choices → Player selects
   └─ If event spawns entities → Create graph nodes
   └─ Apply event effects

3. Skill Selection
   └─ Choose skill table (Personal/Service/Advanced/Assignment/Officer)
   └─ Roll or pick from table
   └─ Add skill to character

4. Advancement Roll
   └─ Success → Increase rank, gain rank skill if applicable
   └─ Failure → No advancement

5. Continue/Muster Out Decision
   └─ Continue → Term + 1, age + 4
   └─ Muster Out → Proceed to benefits
```

**TermResolutionStep UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  NAVY (Line/Crew) - Term 1 (Age 18-22)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ SURVIVAL ─────────────────────────────────────────────┐ │
│  │  Roll: INT 5+   Your DM: +1                            │ │
│  │  Result: 2d6(4,3) + 1 = 8  ✓ SURVIVED                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ EVENT ────────────────────────────────────────────────┐ │
│  │  Roll: 2d6 = 9                                         │ │
│  │                                                        │ │
│  │  "You foil an attempted crime on board, such as        │ │
│  │   mutiny, sabotage, or conspiracy. Gain an Enemy       │ │
│  │   and DM+2 to your next Advancement roll."             │ │
│  │                                                        │ │
│  │  ⚠️ Spawning Entity: ENEMY (NPC)                       │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ Name: [Lt. Vasquez__________]                    │  │ │
│  │  │ Brief: [Saboteur I exposed during my first___]   │  │ │
│  │  │        [tour. They swore revenge.____________]   │  │ │
│  │  │                                                  │  │ │
│  │  │ [Skip Details] [Add to Graph →]                  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ SKILL ────────────────────────────────────────────────┐ │
│  │  Choose skill table:                                   │ │
│  │  [Personal] [Service] [Advanced] [Assignment] [Officer]│ │
│  │                                                        │ │
│  │  Service Table:                                        │ │
│  │  1: Pilot  2: Vacc Suit  3: Athletics  4: Gunner      │ │
│  │  5: Mechanic  6: Gun Combat                           │ │
│  │                                                        │ │
│  │  [Roll (1d6)] or [Pick: Athletics ▼]                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ ADVANCEMENT ──────────────────────────────────────────┐ │
│  │  Roll: EDU 7+   Your DM: +0   Event Bonus: +2          │ │
│  │  Result: 2d6(5,4) + 0 + 2 = 11  ✓ PROMOTED             │ │
│  │  New Rank: Able Spacehand                              │ │
│  │  Rank Skill: Mechanic 1 (or +1 if already have)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [← Re-enlist (Term 2)] [Muster Out →]                      │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] Survival roll auto-performed with result display
- [x] Mishap triggered on survival failure
- [x] Event rolled and displayed from career event table
- [x] Event choices presented when applicable
- [x] Skill table selection and skill gain working
- [x] Advancement roll with rank promotion
- [x] Continue/muster out decision available

---

### Task 6: Entity Spawning from Events

**Effort**: High (3-4 hours)

When events spawn NPCs/locations, create graph nodes:

**Files to create:**

- [x] `apps/web/lib/chargen/entity-spawner.ts`
- [x] `apps/web/components/chargen/EntitySpawnForm.tsx`

**Entity spawning flow:**

1. Event indicates spawn required (from `event.spawns[]`)
2. Show spawn form with fields based on entity type
3. Player provides name + brief description
4. On submit: create graph node with edge to character
5. Store reference in `CareerTermResult.spawnedEntities`

**EntitySpawnForm UI:**

```typescript
interface SpawnFormProps {
  type: 'npc' | 'location' | 'item' | 'secret';
  relationship?: 'ally' | 'contact' | 'rival' | 'enemy';
  template?: string; // For future AI assistance
  onComplete: (entity: SpawnedEntityRef) => void;
  onSkip: () => void;
}
```

**NPC spawn creates:**

```typescript
// Graph node
{
  id: uuid(),
  type: 'npc',
  position: { x: characterNode.x + 200, y: characterNode.y },
  data: {
    label: 'Lt. Vasquez',
    metadata: {
      description: 'Saboteur I exposed during my first tour...',
      relationship: 'enemy',
      createdDuring: { characterId, termNumber: 1, eventRoll: 9 },
    },
  },
}

// Edge from character to NPC
{
  id: uuid(),
  source: characterNodeId,
  target: npcNodeId,
  data: {
    label: 'Enemy',
    metadata: { relationship: 'enemy' },
  },
}
```

**Acceptance criteria:**

- [x] Events with `spawns` array trigger EntitySpawnForm
- [x] NPC spawn creates graph node + edge to character
- [x] Location spawn creates location-type node
- [x] Entity references stored in term result
- [x] Skip option available for optional spawns

---

### Task 7: Benefits/Mustering Out

**Effort**: Medium (2-3 hours)

Resolve mustering out benefits:

**Files to create:**

- [x] `apps/web/components/chargen/steps/MusteringOutStep.tsx`
- [x] `apps/web/lib/chargen/mustering.ts`

**Benefit roll calculation:**

1. Base rolls: 1 per term served
2. +1 per rank (enlisted or officer)
3. +1 if rank 5 or 6
4. Maximum 3 rolls on cash table

**MusteringOutStep UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  MUSTERING OUT                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Terms served: 3                                            │
│  Final rank: Petty Officer, 2nd class (Rank 2)              │
│  Benefit rolls available: 5  (3 terms + 2 ranks)            │
│  Cash rolls remaining: 3                                    │
│                                                             │
│  Roll 1 of 5:                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [Cash Table]  [Benefits Table]                      │   │
│  │                                                      │   │
│  │  Benefits Table (1d6):                               │   │
│  │  1: Personal Vehicle  2: +1 INT  3: +1 EDU           │   │
│  │  4: Weapon  5: Ship Share  6: +1 SOC                 │   │
│  │                                                      │   │
│  │  [Roll (1d6)]                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Accumulated:                                               │
│  - Credits: Cr15,000                                        │
│  - Ship Shares: 1                                           │
│  - Weapon (TL12 Laser Pistol)                               │
│                                                             │
│  [← Back] [Finalize Character →]                            │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] Correct number of benefit rolls calculated
- [x] Cash table limited to 3 rolls
- [x] Benefits accumulated and displayed
- [x] Ship shares, weapons, special items tracked
- [x] High rank alternate benefits available

---

### Task 8: Final Character Node Creation

**Effort**: Medium (2-3 hours)

Create the final character graph node with full metadata:

**Files to create:**

- [x] `apps/web/components/chargen/steps/FinalizeStep.tsx`
- [x] `apps/web/lib/chargen/finalize.ts`

**FinalizeStep UI:**

```
┌─────────────────────────────────────────────────────────────┐
│  FINALIZE CHARACTER                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ SUMMARY ──────────────────────────────────────────────┐ │
│  │  Name: [Commander Sarah Chen_______________]           │ │
│  │  Age: 34                                               │ │
│  │                                                        │ │
│  │  STR 7 (+0)  DEX 9 (+1)  END 8 (+0)                   │ │
│  │  INT 10 (+1) EDU 11 (+1) SOC 6 (+0)                   │ │
│  │                                                        │ │
│  │  Career: Navy (4 terms, Commander)                     │ │
│  │                                                        │ │
│  │  Skills:                                               │ │
│  │  Pilot (Spacecraft) 2, Tactics (Naval) 2, Vacc Suit 1,│ │
│  │  Mechanic 1, Gunner (Turret) 1, Leadership 1,         │ │
│  │  Admin 1, Astrogation 0                               │ │
│  │                                                        │ │
│  │  Benefits: 2 Ship Shares, TL12 Blade, Cr35,000        │ │
│  │                                                        │ │
│  │  Connections:                                          │ │
│  │  - Enemy: Lt. Vasquez (Term 1)                        │ │
│  │  - Ally: Admiral Chen (Term 3)                        │ │
│  │  - Contact: Merchant Captain Yuki (Term 2)            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [← Back to Benefits] [Create Character →]                  │
└─────────────────────────────────────────────────────────────┘
```

**On finalize:**

1. Create character graph node with full metadata
2. Create edges from character to all spawned entities
3. Mark chargen session as completed
4. Navigate to graph view centered on new character

**Character node metadata:**

```typescript
{
  id: uuid(),
  type: 'character',
  position: { x: 0, y: 0 },  // Or positioned based on existing nodes
  data: {
    label: 'Commander Sarah Chen',
    metadata: {
      age: 34,
      characteristics: { STR: 7, DEX: 9, END: 8, INT: 10, EDU: 11, SOC: 6 },
      skills: { 'pilot.spacecraft': 2, 'tactics.naval': 2, ... },
      careerHistory: [
        { career: 'navy', assignment: 'flight', terms: 4, finalRank: 'Commander' }
      ],
      benefits: ['Ship Share x2', 'Blade (TL12)', 'Credits: 35000'],
      createdAt: Date.now(),
      chargenSessionId: sessionId,
    },
  },
}
```

**Acceptance criteria:**

- [x] Character summary displays all accumulated data
- [x] Name can be set/changed before finalizing
- [x] Create button generates character graph node
- [x] Edges created to all spawned entities
- [x] Navigates to graph view on completion

---

## Verification Checklist

After implementation, verify:

- [x] Complete chargen flow from background to finalization
- [x] All 12 CRB careers selectable with correct data
- [x] Dice rolls use seedable PRNG from mgt2e package
- [x] Events spawn graph nodes correctly
- [x] Character node created with full metadata
- [x] State persists across page refreshes
- [ ] Multiple characters can be created in same session (not yet tested)

---

## Testing Strategy

### Unit Tests

- [ ] Characteristic roll generation (pending - future work)
- [ ] Qualification DM calculation (pending - future work)
- [ ] Term resolution logic (survival, advancement) (pending - future work)
- [ ] Benefit roll counting (pending - future work)
- [ ] Skill accumulation (pending - future work)

### Integration Tests

- [ ] CRDT state sync between tabs (pending - future work)
- [ ] Graph node creation from entity spawns (pending - future work)
- [ ] Full chargen flow completion (pending - future work)

### E2E Tests

- [ ] Complete single character generation (pending - future work)
- [ ] Event entity spawning creates visible graph nodes (pending - future work)
- [ ] Character appears in graph after finalization (pending - future work)

---

## Dependencies

- **@planeshift/mgt2e**: Career/skill data, dice roller, event tables
- **Yjs + Hocuspocus**: CRDT state persistence
- **React Flow**: Graph node creation for spawned entities

---

## Blocks

Completing this phase unblocks:

- **Phase A3**: AI Narrative Layer (needs event resolution flow)
- **Phase A4**: Multiplayer Chargen (needs single-player flow working)
- **Phase A5**: Lifepath Visualization (needs career term data)
- **Chunk D**: Push to Foundry (needs characters to push)
