# Foundry MGT2e Integration Architecture

> **Document Type**: Reference Architecture + Design Document
> **Created**: Tue Jan 27 2026
> **Purpose**: Capture all research on Foundry MGT2e capabilities to enable future implementation without re-analysis
> **Scope**: Architecture review only - NO implementation tasks

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [MGT2e System Reference](#mgt2e-system-reference)
4. [Target Architecture](#target-architecture)
5. [Data Authority Model](#data-authority-model)
6. [Sync Protocols](#sync-protocols)
7. [TypeScript Interfaces](#typescript-interfaces)
8. [Implementation Phases](#implementation-phases)
9. [Explicit Exclusions](#explicit-exclusions)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)
11. [Open Questions for Implementation](#open-questions-for-implementation)

---

## Executive Summary

### The Core Principle: "Foundry = Sim, PlaneShift = Story"

PlaneShift should NOT replicate functionality that MGT2e already provides. Instead:

| Domain | Owner | Rationale |
|--------|-------|-----------|
| **Dice Rolling & Skill Checks** | Foundry | Complete 2d6 engine with Boon/Bane, Effect calculation |
| **Combat Resolution** | Foundry | Damage chains, weapon traits, criticals |
| **Trade Mechanics** | Foundry | Price fluctuation, trade codes, 6-parsec limit |
| **Spacecraft Systems** | Foundry | Power, fuel, combat, critical tables |
| **Character Generation** | Foundry | Career terms, aging, mishaps |
| **Character Relationships** | PlaneShift | Graph-based faction/NPC connections |
| **Narrative & Biography** | PlaneShift | Backstory, notes, secrets |
| **Session History** | PlaneShift | Timeline, events, campaign arc |
| **Lifepath Visualization** | PlaneShift | Graph of connections and history |
| **RAG Queries** | PlaneShift | AI-powered knowledge with permission gating |

### Key Architectural Decisions

1. **Field-Level Authority** (MVP): Each field has ONE owner. The other side mirrors read-only.
2. **PlaneShift → Foundry Primary Flow**: Characters created in PlaneShift, pushed to Foundry for tactical play.
3. **Public APIs Only**: No modifications to MGT2e system code.
4. **Phased Rollout**: Core actors first, full bidirectional later.

---

## Current State

### PlaneShift Implementation (As Of Jan 2026)

#### Foundry Bridge Module
- **Location**: `packages/foundry-module/`
- **Protocol**: Native WebSocket to PlaneShift server (`/foundry` endpoint)
- **Echo Prevention**: Uses `options.planeshift` flag in `actor.update()`

#### Currently Synced Fields
| PlaneShift Field | Foundry Path | Direction |
|------------------|--------------|-----------|
| `hp.current` | `system.hits.value` | Bidirectional |
| `hp.max` | `system.hits.max` | Bidirectional |
| `characteristics.*` | `system.characteristics.*.value` | Bidirectional |
| `credits` | `system.finance.cash` | Bidirectional |
| `label` | `name` | Bidirectional |
| `foundry_uuid` | Actor UUID | Link identifier |

#### Current Limitations
- **No Skills**: Not synced or stored
- **No Items**: Inventory not tracked
- **No Career Terms**: Character history not preserved
- **No World Data**: UWP/trade codes not captured
- **No Journals**: Narrative content stays in PlaneShift
- **Actor Types Only**: `traveller`, `npc` partially; others undefined

---

## MGT2e System Reference

### Repository Information
- **URL**: https://github.com/Mongoose-Publishing/traveller-foundryvtt
- **Author**: Samuel Penn (NotASnark) / Mongoose Publishing
- **Compatibility**: Foundry VTT v12, v13
- **Manifest**: `https://github.com/Mongoose-Publishing/traveller-foundryvtt/raw/latest/release/system.json`

### Actor Types (Complete Reference)

| Type | Description | Key Data Structures |
|------|-------------|---------------------|
| **traveller** | Player Character | characteristics, skills, finance, sophont, terms |
| **npc** | Non-Player Character | Streamlined traveller, same core fields |
| **spacecraft** | Starships | dtons, power, fuel, drives (M/J/R), mounts, crew, computer |
| **vehicle** | Ground/Air Vehicles | chassis, speed, agility, shipping tonnage |
| **world** | Planets/Systems | UWP, trade codes, bases, starport, travel zone |
| **creature** | Animals/Monsters | behavior, diet, traits, attacks |
| **swarm** | Grouped Enemies | count, individual stats, swarm behavior |
| **container** | Storage/Cargo | capacity, contents, lock status |

### Item Types (Complete Reference)

| Type | Description | Key Fields |
|------|-------------|------------|
| **weapon** | Weapons | damage, magazine, traits, skill, characteristic |
| **armour** | Armor | protection, rad, archaic, layered, powered |
| **cargo** | Trade Goods | price, availability, purchaseDM, saleDM, tons, illegal |
| **term** | Career Term | number, termLength, assignment, randomTerm |
| **hardware** | Ship Components | system, tons, power, rating, mount |
| **software** | Programs | class, type, bandwidth, interface |
| **associate** | Contacts/Rivals | affinity, enmity, power, influence |
| **augment** | Cybernetics | bonus, slot, power consumption |
| **role** | Crew Position | skill requirements, station |
| **skill** | Skill Item | level, specialties |
| **junk** | Misc Items | weight, value, description |

### Characteristics System

MGT2e uses the Universal Personality Profile (UPP):

| Characteristic | Code | DM Calculation |
|----------------|------|----------------|
| **Strength** | STR | `Math.floor((value - 7) / 3)` |
| **Dexterity** | DEX | Same formula |
| **Endurance** | END | Same formula |
| **Intelligence** | INT | Same formula |
| **Education** | EDU | Same formula |
| **Social Standing** | SOC | Same formula |
| **Psionic Strength** | PSI | Optional, same formula |
| **Charisma** | CHA | Alternative to SOC |
| **Territory** | TER | Creature-specific |
| **Wealth** | WLT | Alternative economic stat |
| **Luck** | LCK | House rule support |
| **Morale** | MRL | NPC-specific |

### Skills System

MGT2e has ~60 skills, many with specialties:

```javascript
// Example from config.mjs
MGT2.SKILLS = {
  "admin": { "default": "INT" },
  "advocate": { "default": "EDU" },
  "animals": { 
    "default": "INT",
    "specialities": { 
      "handling": {}, 
      "vetinary": {}, 
      "training": {} 
    } 
  },
  "athletics": {
    "default": "DEX",
    "specialities": {
      "dexterity": { "default": "DEX" },
      "endurance": { "default": "END" },
      "strength": { "default": "STR" }
    }
  },
  "engineer": {
    "default": "EDU",
    "requires": "INT",
    "specialities": {
      "mDrive": {},
      "jDrive": {},
      "lifeSupport": {},
      "power": {}
    }
  },
  // ... 55+ more skills
};
```

### UWP (Universal World Profile) System

```javascript
// World actor system.uwp structure
{
  "port": "A",           // Starport class A-E, X
  "size": 8,             // 0-F (hex)
  "atmosphere": 6,       // 0-F (hex)
  "hydrographics": 7,    // 0-A
  "population": 9,       // 0-C
  "government": 6,       // 0-F
  "lawLevel": 5,         // 0-J
  "techLevel": 12,       // 0-F+
  "zone": null,          // "green", "amber", "red", null
  "bases": "NS",         // Naval, Scout, Research, TAS, etc.
  "codes": "Hi In Ri"    // Calculated trade codes
}
```

**Trade Code Derivation** (from `world-utils.mjs`):
| Code | Criteria |
|------|----------|
| Agricultural (Ag) | Atmo 4-9, Hydro 4-8, Pop 5-7 |
| Asteroid (As) | Size 0, Atmo 0, Hydro 0 |
| Barren (Ba) | Pop 0, Govt 0, Law 0 |
| Desert (De) | Atmo 2+, Hydro 0 |
| Fluid (Fl) | Atmo 10+, Hydro 1+ |
| Garden (Ga) | Size 6-8, Atmo 5/6/8, Hydro 5-7 |
| High Pop (Hi) | Pop 9+ |
| High Tech (Ht) | Tech 12+ |
| Ice-Capped (Ic) | Atmo 0-1, Hydro 1+ |
| Industrial (In) | Atmo 0/1/2/4/7/9/A/B/C, Pop 9+ |
| Low Pop (Lo) | Pop 1-3 |
| Low Tech (Lt) | Tech 5- |
| Non-Ag (Na) | Atmo 0-3, Hydro 0-3, Pop 6+ |
| Non-Ind (Ni) | Pop 4-6 |
| Poor (Po) | Atmo 2-5, Hydro 0-3 |
| Rich (Ri) | Atmo 6/8, Pop 6-8 |
| Vacuum (Va) | Atmo 0 |
| Water World (Wa) | Hydro A |

### Spacecraft Systems

```javascript
// Spacecraft actor system structure
{
  "hull": {
    "dtons": 400,
    "structure": 10,
    "armour": 4,
    "streamlined": true
  },
  "power": {
    "max": 200,
    "used": 175,
    "available": 25
  },
  "fuel": {
    "max": 100,
    "current": 85,
    "jumpTons": 40   // Per jump-1
  },
  "drives": {
    "mDrive": { "rating": 2, "tons": 8, "power": 20 },
    "jDrive": { "rating": 2, "tons": 20, "power": 0 },
    "rDrive": null   // Reaction drive (optional)
  },
  "computer": {
    "rating": 15,
    "bis": false,
    "fib": false
  },
  "crew": {
    "positions": ["pilot", "astrogator", "engineer", "gunner"],
    "minimum": 4,
    "current": 6
  }
}
```

### Exposed APIs

```javascript
// Global API object
game.mgt2e = {
  // Dice rolling
  rollSkillMacro(skillName, options),    // Skill check with all modifiers
  rollAttackMacro(itemName),             // Attack roll with weapon traits
  
  // Generation
  generateNpc(actor, options),           // NPC generator
  
  // Utilities
  getCharacteristic(actor, char),        // Get characteristic value
  getCharacteristicDM(actor, char),      // Get DM for characteristic
  getSkillValue(actor, skillName),       // Get skill level
};

// Socket events (multiplayer)
game.socket.on("system.mgt2e", (data) => {
  // data.type can be:
  // - "applyDamageToActor"
  // - "tradeBuyGoods"
  // - "worldBrokerDrop"
  // - "swarmLaunch"
  // - "passengerEmbark"
});

// Foundry Hooks available
Hooks.on("updateActor", (actor, changes, options, userId) => {});
Hooks.on("createItem", (item, options, userId) => {});
Hooks.on("updateItem", (item, changes, options, userId) => {});
Hooks.on("deleteItem", (item, options, userId) => {});
Hooks.on("createJournalEntry", (journal, options, userId) => {});
Hooks.on("updateJournalEntry", (journal, changes, options, userId) => {});
```

---

## Target Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FOUNDRY VTT                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         MGT2e Game System                               ││
│  │  • Dice Engine (2d6, Boon/Bane, Effect)                                ││
│  │  • Combat (damage chains, weapon traits, criticals)                     ││
│  │  • Trade (price calc, trade codes, 6-parsec limit)                      ││
│  │  • Spacecraft (power, fuel, combat, criticals)                          ││
│  │  • Character Sheets (skills, careers, aging)                            ││
│  │  • World Generation (UWP, trade codes)                                  ││
│  │  • NPC Generator                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     PlaneShift Bridge Module                            ││
│  │  • WebSocket client to PlaneShift server                                ││
│  │  • Hooks: updateActor, createItem, updateItem, deleteItem               ││
│  │  • Echo prevention via options.planeshift flag                          ││
│  │  • Field mapping: Foundry paths ↔ PlaneShift metadata                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ WebSocket (ws://server:3002/foundry)
                                 │ Messages: actor_update, node_update,
                                 │           journal_update, world_update
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PLANESHIFT SERVER                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ Hocuspocus   │ │ Fastify API  │ │ Foundry WS   │ │ Conflict Resolution  ││
│  │ (CRDT Sync)  │ │ (REST)       │ │ Handler      │ │ Engine               ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         PostgreSQL Database                             ││
│  │  • Campaign Y.Doc binary storage                                        ││
│  │  • Sync state (timestamps, field values, conflict queue)                ││
│  │  • Character knowledge (RAG permissions)                                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ Hocuspocus WebSocket + REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PLANESHIFT WEB APP                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                          Campaign Graph                               │   │
│  │  • Nodes: traveller, npc, spacecraft, world, faction, location       │   │
│  │  • Edges: relationships, connections, history                         │   │
│  │  • Metadata: Full MGT2e-compatible data structures                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐   │
│  │ Faction Tables  │ │ Character Panel │ │ RAG Query Interface         │   │
│  │ (reputation)    │ │ (view/edit)     │ │ (AI-powered knowledge)      │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### Pattern 1: PlaneShift → Foundry (Primary for Characters)

```
1. User creates Character node in PlaneShift Graph
2. User fills in metadata (name, characteristics, skills, equipment)
3. User clicks "Push to Foundry" button
4. PlaneShift sends `create_actor` message via WebSocket
5. Foundry Bridge creates Actor via Foundry API
6. Foundry returns Actor UUID
7. PlaneShift stores UUID in node.metadata.foundry_uuid
8. Ongoing sync established for this actor pair
```

#### Pattern 2: Foundry → PlaneShift (Secondary, for Existing Campaigns)

```
1. GM has existing Foundry world with actors
2. GM clicks "Import from Foundry" in PlaneShift
3. PlaneShift sends `list_actors` request
4. Foundry Bridge returns actor list with basic info
5. User selects which actors to import
6. PlaneShift creates Graph nodes with foundry_uuid links
7. Full sync pulls all actor data into PlaneShift metadata
```

#### Pattern 3: Ongoing Bidirectional Sync

```
1. Change occurs in Foundry (e.g., HP reduced in combat)
2. Foundry Hook fires `updateActor`
3. Bridge checks: is options.planeshift set? If yes, ignore (echo prevention)
4. Bridge sends `actor_update` with changed fields only
5. Server receives, checks field authority
6. If Foundry-authoritative field: update PlaneShift immediately
7. If PlaneShift-authoritative field: queue for conflict resolution
8. Server broadcasts update to connected PlaneShift clients
9. Web app updates local Y.Doc
```

---

## Data Authority Model

### Field-Level Authority Table

| Data Category | Field Path | Authority (MVP) | Authority (Future) | Notes |
|---------------|------------|-----------------|-------------------|-------|
| **Identity** |||||
| Name | `name` | Bidirectional | Bidirectional | Last-write-wins |
| Actor Type | `type` | Foundry | Foundry | Cannot change after creation |
| **Characteristics** |||||
| STR/DEX/END/INT/EDU/SOC | `system.characteristics.*.value` | Foundry | Bidirectional | Future: PlaneShift events affect |
| DM Values | `system.characteristics.*.dm` | Derived | Derived | Never sync, always calculate |
| **Combat Stats** |||||
| HP Current | `system.hits.value` | Foundry | Bidirectional | Future: Blue-booking damage |
| HP Max | `system.hits.max` | Foundry | Foundry | Foundry handles endurance calcs |
| **Finance** |||||
| Credits | `system.finance.cash` | Foundry | Bidirectional | Future: PlaneShift purchases |
| Ship Shares | `system.finance.shares` | Foundry | Foundry | Part of character creation |
| **Skills** |||||
| Skill Levels | `system.skills.*` | Foundry | Foundry | Complex interdependencies |
| **Inventory** |||||
| Items Array | `items[]` | Foundry | Bidirectional | Future: PlaneShift item creation |
| Item Quantities | `items[].system.quantity` | Foundry | Bidirectional | |
| **Career History** |||||
| Career Terms | `items[type=term]` | Foundry | Foundry | Created during chargen |
| Associates | `items[type=associate]` | Merged | Merged | Both can add contacts |
| **Narrative** |||||
| Biography | `system.details.bio` | PlaneShift | PlaneShift | Narrative authority |
| Notes | `system.details.notes` | PlaneShift | PlaneShift | GM/Player notes |
| Description | `metadata.description` | PlaneShift | PlaneShift | Graph node description |
| Tags | `metadata.tags` | PlaneShift | PlaneShift | PlaneShift-only |
| **Relationships** |||||
| Faction Standing | N/A | PlaneShift | PlaneShift | Not in Foundry |
| Graph Edges | N/A | PlaneShift | PlaneShift | Not in Foundry |

### Conflict Resolution Strategies

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| **Last-Write-Wins (LWW)** | Name, runtime stats | Most recent timestamp wins |
| **Foundry-Authoritative** | Skills, career, computed values | Foundry always wins |
| **PlaneShift-Authoritative** | Biography, narrative | PlaneShift always wins |
| **Merge** | Associates, items (future) | Union of both, per-item LWW |
| **Queue for Manual** | Conflicting substantial edits | GM decides in conflict UI |

### Session Boundary Rules

| Scenario | Behavior |
|----------|----------|
| **Foundry session active** | Foundry-authoritative for combat stats |
| **No Foundry connection** | PlaneShift operates independently, queues sync |
| **Reconnection** | PlaneShift pulls latest Foundry state for Foundry-auth fields |
| **"Start Session" action** | Push all PlaneShift changes to Foundry |
| **"End Session" action** | Pull final Foundry state, archive session |

---

## Sync Protocols

### Message Types

#### `actor_update` (Foundry → Server)
```typescript
{
  type: "actor_update",
  payload: {
    actorId: string,          // Internal Foundry actor ID
    foundryUuid: string,      // Full UUID (Actor.xxxx)
    actorType: string,        // "traveller", "npc", "spacecraft", etc.
    changes: {
      // Only changed fields, using dot notation
      "system.hits.value": 15,
      "system.finance.cash": 50000,
      // Items as array operations
      "items": [
        { op: "add", item: {...} },
        { op: "update", _id: "xxx", changes: {...} },
        { op: "delete", _id: "xxx" }
      ]
    },
    timestamp: number,
    userId: string            // Foundry user who made change
  }
}
```

#### `node_update` (Server → Foundry)
```typescript
{
  type: "node_update",
  payload: {
    nodeId: string,           // PlaneShift node ID
    foundryUuid: string,      // Target Foundry actor
    changes: {
      // PlaneShift-format changes to apply
      hp: { current: 12, max: 21 },
      characteristics: { str: 9, dex: 10 },
      credits: 45000
    }
  }
}
```

#### `create_actor` (Server → Foundry)
```typescript
{
  type: "create_actor",
  payload: {
    nodeId: string,           // PlaneShift node to link
    actorData: {
      name: string,
      type: "traveller" | "npc" | "spacecraft" | "world",
      system: {...},          // Full MGT2e system data
      items: [...]            // Embedded items
    }
  }
}
```

#### `actor_created` (Foundry → Server)
```typescript
{
  type: "actor_created",
  payload: {
    nodeId: string,           // Original PlaneShift node
    foundryUuid: string,      // New actor UUID
    actorId: string           // New actor ID
  }
}
```

### Sync State Database Schema

```sql
-- Track sync state per actor per field
CREATE TABLE sync_state (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  foundry_uuid VARCHAR(255) NOT NULL,
  field_path VARCHAR(255) NOT NULL,
  
  -- Values from each source
  planeshift_value JSONB,
  foundry_value JSONB,
  
  -- Timestamps for conflict detection
  planeshift_timestamp TIMESTAMP,
  foundry_timestamp TIMESTAMP,
  last_sync TIMESTAMP,
  
  -- Conflict handling
  conflict_status VARCHAR(50),  -- NULL, 'pending', 'resolved'
  resolution VARCHAR(50),       -- 'keep_foundry', 'keep_planeshift', 'manual'
  
  UNIQUE(campaign_id, node_id, field_path)
);

-- Track item-level sync (more granular than actor)
CREATE TABLE item_sync_state (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  actor_node_id VARCHAR(255) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  foundry_item_id VARCHAR(255),
  
  planeshift_data JSONB,
  foundry_data JSONB,
  
  last_sync TIMESTAMP,
  sync_direction VARCHAR(50),  -- 'foundry_to_ps', 'ps_to_foundry', 'bidirectional'
  
  UNIQUE(campaign_id, actor_node_id, item_id)
);
```

---

## TypeScript Interfaces

### Core MGT2e Types

```typescript
// packages/shared/src/types/mgt2e/characteristics.ts

export interface Mgt2eCharacteristic {
  value: number;
  dm: number;  // Derived, do not sync
}

export interface Mgt2eCharacteristics {
  str: Mgt2eCharacteristic;
  dex: Mgt2eCharacteristic;
  end: Mgt2eCharacteristic;
  int: Mgt2eCharacteristic;
  edu: Mgt2eCharacteristic;
  soc: Mgt2eCharacteristic;
  psi?: Mgt2eCharacteristic;
  cha?: Mgt2eCharacteristic;  // Alternative to SOC
}

export type CharacteristicCode = 'str' | 'dex' | 'end' | 'int' | 'edu' | 'soc' | 'psi' | 'cha';
```

```typescript
// packages/shared/src/types/mgt2e/skills.ts

export interface Mgt2eSkillSpecialty {
  value: number;
  default?: CharacteristicCode;
}

export interface Mgt2eSkill {
  value: number;
  default: CharacteristicCode;
  requires?: CharacteristicCode;
  specialities?: Record<string, Mgt2eSkillSpecialty>;
}

export type Mgt2eSkills = Record<string, Mgt2eSkill>;

// Complete skill list from MGT2e config.mjs
export const MGT2E_SKILL_LIST = [
  'admin', 'advocate', 'animals', 'art', 'astrogation', 'athletics',
  'broker', 'carouse', 'deception', 'diplomat', 'drive', 'electronics',
  'engineer', 'explosives', 'flyer', 'gambler', 'gunCombat', 'gunnery',
  'heavyWeapons', 'independence', 'investigate', 'jackofalltrades',
  'language', 'leadership', 'mechanic', 'medic', 'melee', 'navigation',
  'persuade', 'pilot', 'profession', 'recon', 'science', 'seafarer',
  'stealth', 'steward', 'streetwise', 'survival', 'tactics', 'vaccSuit'
] as const;
```

```typescript
// packages/shared/src/types/mgt2e/items.ts

export type Mgt2eItemType = 
  | 'weapon' 
  | 'armour' 
  | 'cargo' 
  | 'term' 
  | 'hardware' 
  | 'software' 
  | 'associate' 
  | 'augment' 
  | 'role' 
  | 'skill' 
  | 'junk';

export interface Mgt2eItemBase {
  _id: string;
  name: string;
  type: Mgt2eItemType;
  img?: string;
  system: Record<string, unknown>;
}

export interface Mgt2eWeaponItem extends Mgt2eItemBase {
  type: 'weapon';
  system: {
    damage: string;           // e.g., "3D6"
    magazine: number;
    traits: string[];         // e.g., ["ap", "auto2"]
    skill: string;            // e.g., "gunCombat"
    characteristic: CharacteristicCode;
    range: string;            // e.g., "ranged"
    scale: string;            // e.g., "personal", "vehicle", "spacecraft"
  };
}

export interface Mgt2eArmourItem extends Mgt2eItemBase {
  type: 'armour';
  system: {
    protection: number;
    rad: number;
    archaic: boolean;
    layered: boolean;
    powered: boolean;
  };
}

export interface Mgt2eCargoItem extends Mgt2eItemBase {
  type: 'cargo';
  system: {
    price: number;
    availability: string;
    purchaseDM: string;
    saleDM: string;
    tons: string;             // Can be formula like "2D6 * 10"
    illegal: boolean;
  };
}

export interface Mgt2eTermItem extends Mgt2eItemBase {
  type: 'term';
  system: {
    career: string;
    number: number;
    termLength: number;
    assignment: string;
    randomTerm: boolean;
    randomLength?: string;
  };
}

export interface Mgt2eAssociateItem extends Mgt2eItemBase {
  type: 'associate';
  system: {
    affinity: number;         // -2 to +2
    enmity: number;           // -2 to +2
    power: number;            // Influence level
    influence: number;
    relationship: string;     // "contact", "ally", "rival", "enemy"
  };
}
```

```typescript
// packages/shared/src/types/mgt2e/actors.ts

export interface Mgt2eTravellerActor {
  _id: string;
  name: string;
  type: 'traveller';
  img?: string;
  system: {
    characteristics: Mgt2eCharacteristics;
    skills: Mgt2eSkills;
    hits: {
      value: number;
      max: number;
    };
    finance: {
      cash: number;
      debt: number;
      pension: number;
      livingCost: number;
      shares: number;
    };
    sophont: {
      age: number;
      species: string;
      gender: string;
      title: string;
    };
    details: {
      bio: string;
      notes: string;
    };
  };
  items: Mgt2eItemBase[];
}

export interface Mgt2eNpcActor extends Mgt2eTravellerActor {
  type: 'npc';
}

export interface Mgt2eWorldActor {
  _id: string;
  name: string;
  type: 'world';
  system: {
    world: {
      uwp: Mgt2eUWP;
      extra: {
        importance: number;
        economicX: string;
        cultural: string;
        nobility: string;
      };
      meta: {
        sector: string;
        subsector: string;
        hex: string;
      };
    };
  };
}

export interface Mgt2eUWP {
  port: string;               // A-E, X
  size: number;               // 0-F
  atmosphere: number;         // 0-F
  hydrographics: number;      // 0-A
  population: number;         // 0-C
  government: number;         // 0-F
  lawLevel: number;           // 0-J
  techLevel: number;          // 0-F+
  zone: 'green' | 'amber' | 'red' | null;
  bases: string;              // N, S, R, T, etc.
  codes: string;              // Calculated trade codes
}

export interface Mgt2eSpacecraftActor {
  _id: string;
  name: string;
  type: 'spacecraft';
  system: {
    hull: {
      dtons: number;
      structure: number;
      armour: number;
      streamlined: boolean;
    };
    power: {
      max: number;
      used: number;
      available: number;
    };
    fuel: {
      max: number;
      current: number;
      jumpTons: number;
    };
    drives: {
      mDrive: { rating: number; tons: number; power: number } | null;
      jDrive: { rating: number; tons: number; power: number } | null;
      rDrive: { rating: number; tons: number; power: number } | null;
    };
    computer: {
      rating: number;
      bis: boolean;
      fib: boolean;
    };
    crew: {
      positions: string[];
      minimum: number;
      current: number;
    };
  };
  items: Mgt2eItemBase[];  // Hardware, software, weapons
}
```

### PlaneShift Node Metadata Extensions

```typescript
// packages/shared/src/types/graph.ts (extended)

export interface TravellerMetadata {
  // Foundry link
  foundry_uuid?: string;
  
  // MGT2e data (mirrored from Foundry)
  characteristics?: Record<CharacteristicCode, number>;
  skills?: Record<string, number | Record<string, number>>;
  hp?: { current: number; max: number };
  credits?: number;
  age?: number;
  species?: string;
  
  // Items (simplified for PlaneShift, full data in Foundry)
  items?: Array<{
    id: string;
    foundry_id?: string;
    name: string;
    type: Mgt2eItemType;
    quantity?: number;
  }>;
  
  // Career history
  careers?: Array<{
    name: string;
    terms: number;
    assignment?: string;
  }>;
  
  // Associates (may differ from Foundry)
  associates?: Array<{
    name: string;
    relationship: 'contact' | 'ally' | 'rival' | 'enemy';
    affinity: number;
    enmity: number;
    linkedNodeId?: string;  // Link to another graph node
  }>;
  
  // PlaneShift-only narrative
  description?: string;
  tags?: string[];
  image_url?: string;
  hidden_notes?: string;   // GM-only
}

export interface WorldMetadata {
  foundry_uuid?: string;
  
  // UWP (mirrored from Foundry)
  uwp?: Mgt2eUWP;
  
  // Derived (calculated, don't sync)
  tradeCodes?: string[];
  
  // Sector location
  sector?: string;
  subsector?: string;
  hex?: string;
  
  // PlaneShift narrative
  description?: string;
  controllingFaction?: string;  // Link to faction node
  factionStanding?: Record<string, number>;  // Per-faction standing on this world
  tags?: string[];
}

export interface SpacecraftMetadata {
  foundry_uuid?: string;
  
  // Ship identity (for reference, not full sync)
  shipClass?: string;
  tonnage?: number;
  jumpRating?: number;
  
  // Ownership
  ownerNodeId?: string;    // Link to traveller/faction who owns it
  
  // PlaneShift narrative
  description?: string;
  tags?: string[];
}
```

---

## Implementation Phases

### Phase 0: Foundation (Current State)
**Status**: Complete
- Basic actor sync (HP, characteristics, credits)
- Echo prevention
- WebSocket bridge

### Phase 1: Core Expansion
**Scope**: Extend sync to cover essential character data
- [ ] Add Skills sync (read-only from Foundry)
- [ ] Add Items sync (read-only from Foundry)  
- [ ] Add Career Terms sync (read-only)
- [ ] Add Associates sync (bidirectional merge)
- [ ] TypeScript conversion of foundry-module
- [ ] Extend PlaneShift node metadata schemas
- [ ] Character panel UI to display synced data

### Phase 2: World Integration
**Scope**: World actors and sector data
- [ ] World actor sync (UWP, trade codes)
- [ ] World metadata schema in PlaneShift
- [ ] World node auto-linking
- [ ] Sector visualization enhancements

### Phase 3: Character Creation Flow
**Scope**: PlaneShift → Foundry actor creation
- [ ] "Push to Foundry" button
- [ ] Actor creation message handler
- [ ] UUID linking ceremony
- [ ] Initial data population

### Phase 4: Journal Integration
**Scope**: Bidirectional journal sync
- [ ] JournalEntry hooks in bridge module
- [ ] Journal node type or edge attachment
- [ ] News feed push to Foundry
- [ ] Session notes sync

### Phase 5: Full Bidirectional
**Scope**: PlaneShift can modify Foundry-authoritative fields
- [ ] HP/stats modification from PlaneShift
- [ ] Item creation from PlaneShift
- [ ] Conflict resolution UI
- [ ] Blue-booking workflow

### Phase 6: Spacecraft & Beyond
**Scope**: Additional actor types
- [ ] Spacecraft actor sync
- [ ] Ship ownership tracking
- [ ] Vehicle actors (if needed)
- [ ] Creature actors (if needed)

---

## Explicit Exclusions

### NEVER Implement in PlaneShift

| Exclusion | Rationale |
|-----------|-----------|
| **Dice Rolling Engine** | MGT2e has complete 2d6 with Boon/Bane, Effect, chain bonuses |
| **Combat Resolution** | Damage chains (END→STR→DEX), weapon traits, criticals |
| **Trade Price Calculation** | Purchase/sale DMs from trade codes, price fluctuation |
| **Spacecraft Combat** | Power management, critical tables, salvo calculations |
| **Character Generation Mechanics** | Career paths, mishaps, events, aging tables |
| **NPC Stat Generation** | Table-driven generation with skill allocation |
| **Skill Check Automation** | Untrained penalties, specialty handling |
| **UWP Calculations** | Trade code derivation from atmospheric conditions |

### Deferred (Not MVP)

| Item | Reason to Defer |
|------|-----------------|
| Vehicle actors | Less common, similar to spacecraft |
| Creature actors | Monster management is Foundry's strength |
| Swarm actors | Combat-specific, Foundry handles |
| Container actors | Inventory edge case |
| Multi-world support | Single campaign assumption for MVP |
| Compendium sync | Read-only in Foundry, complexity |

---

## Edge Cases & Error Handling

### Data Integrity

| Edge Case | Handling |
|-----------|----------|
| **Duplicate foundry_uuid** | Validation prevents; if occurs, warn user and refuse sync |
| **Deleted Foundry actor** | Mark PlaneShift node as "unlinked", preserve data |
| **Actor renamed in Foundry** | Update PlaneShift label (name is bidirectional LWW) |
| **Actor type mismatch** | Warn user; cannot change type after creation |
| **Non-MGT2e actor** | Ignore gracefully; only sync mgt2e system actors |

### Sync Timing

| Edge Case | Handling |
|-----------|----------|
| **Bulk import (50 actors)** | Queue with rate limiting (10/second max) |
| **Rapid updates (slider drag)** | Debounce 500ms before sending |
| **Reconnection storm** | Server queues updates, processes in timestamp order |
| **Offline PlaneShift edits** | CRDT handles; on reconnect, resolve per authority rules |
| **Foundry offline, PlaneShift edits** | PlaneShift is source; on Foundry reconnect, push changes |

### Permission Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Ownership transfer in Foundry** | Sync ownership change to PlaneShift node permissions |
| **GM-only fields** | Sync all data; PlaneShift handles visibility gating |
| **Limited permission actor** | Sync metadata only (no system data access) |
| **Player edits unowned actor** | Block at Foundry level; never reaches PlaneShift |

### Error States

| Error | Recovery |
|-------|----------|
| **WebSocket disconnect** | Exponential backoff reconnect (1s, 2s, 4s, 8s, max 30s) |
| **Sync message parse fail** | Log error, skip message, continue |
| **Actor.update() fails in Foundry** | Return error to PlaneShift, show toast, retry option |
| **Conflict detection** | Queue to conflict resolution UI, notify GM |
| **Schema version mismatch** | Warn user, attempt best-effort mapping, log issues |

---

## Open Questions for Implementation

### To Resolve Before Phase 1

1. **TypeScript Migration Strategy**: Convert foundry-module to TypeScript first, or after expansion?
2. **Skill Display UI**: Where in PlaneShift UI should skills appear? Character panel? Separate view?
3. **Item Display**: Flat list or categorized (weapons, armor, cargo)?
4. **Associate Merge Strategy**: How to handle same person as associate in both systems with different affinities?

### To Resolve Before Phase 2

5. **World Node Creation**: Auto-create from Foundry worlds, or user-initiated linking?
6. **Sector Visualization**: Show UWP data on graph nodes, or separate sector map?
7. **Trade Code Display**: Calculate in PlaneShift or trust Foundry's calculated `codes` field?

### To Resolve Before Phase 3

8. **Actor Creation Permissions**: Who can push new actors to Foundry? GM only? Any player?
9. **Default Actor Data**: What defaults for a new traveller? Empty skills or generated?
10. **Folder Organization**: Where in Foundry actor list should PlaneShift-created actors go?

### To Resolve Before Phase 4

11. **Journal Structure**: One journal per node, or one journal per campaign with pages?
12. **Journal Permissions**: Who can see which journal entries?
13. **News Feed Format**: Plain text, HTML, or Foundry's journal pages?

### To Resolve Before Phase 5

14. **Conflict UI Design**: Modal, sidebar, or dedicated page?
15. **Blue-Booking Workflow**: Explicit "start blue-booking" action or automatic?
16. **HP Modification Authorization**: Can any player modify HP, or GM only?

---

## Appendix A: MGT2e Config.mjs Reference Locations

For future implementation, these are the key config locations in the MGT2e repo:

| Data | File Path | Lines |
|------|-----------|-------|
| Characteristics | `mgt2e/module/helpers/config.mjs` | 1-50 |
| Skills List | `mgt2e/module/helpers/config.mjs` | 554-828 |
| Weapon Traits | `mgt2e/module/helpers/config.mjs` | 200-300 |
| Spacecraft Criticals | `mgt2e/module/helpers/config.mjs` | 400-500 |
| Trade Codes | `mgt2e/module/helpers/utils/world-utils.mjs` | 234-310 |
| Starport Facilities | `mgt2e/module/helpers/config.mjs` | 1003-1011 |
| Dice Roll Logic | `mgt2e/module/helpers/dice-rolls.mjs` | 1-1200 |
| Actor Sheet | `mgt2e/module/sheets/actor-sheet.mjs` | Full file |
| Template Schema | `mgt2e/template.json` | Full file |

---

## Appendix B: Foundry API Quick Reference

### Document Lifecycle Hooks

```javascript
// Creation
Hooks.on("preCreateActor", (actor, data, options, userId) => {});
Hooks.on("createActor", (actor, options, userId) => {});

// Update
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {});
Hooks.on("updateActor", (actor, changes, options, userId) => {});

// Deletion
Hooks.on("preDeleteActor", (actor, options, userId) => {});
Hooks.on("deleteActor", (actor, options, userId) => {});

// Items (embedded)
Hooks.on("createItem", (item, options, userId) => {});
Hooks.on("updateItem", (item, changes, options, userId) => {});
Hooks.on("deleteItem", (item, options, userId) => {});
```

### Actor Update Pattern

```javascript
// Differential update (only send changed fields)
await actor.update({
  "name": "New Name",
  "system.hits.value": 15,
  "system.finance.cash": 50000
}, { planeshift: true });  // Custom flag for echo prevention
```

### Socket Communication

```javascript
// Emit custom event
game.socket.emit("module.plane-shift-bridge", {
  type: "actor_update",
  payload: { ... }
});

// Listen for events
game.socket.on("module.plane-shift-bridge", (data) => {
  if (data.type === "node_update") {
    handleNodeUpdate(data.payload);
  }
});
```

---

## Appendix C: Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-27 | Field-level authority for MVP | Simpler conflict resolution |
| 2026-01-27 | PlaneShift → Foundry primary flow | PlaneShift is chargen tool |
| 2026-01-27 | Public APIs only | No MGT2e code modifications |
| 2026-01-27 | Core actors (traveller, npc, world) for MVP | Most common use cases |
| 2026-01-27 | Spacecraft linking MVP+, not full sync | Reference existing ships |
| 2026-01-27 | Journal sync bidirectional | News feeds + GM notes |
