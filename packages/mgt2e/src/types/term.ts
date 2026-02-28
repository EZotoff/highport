import type { CareerEvent, CareerMishap } from './event.js';
import type { CharacterSkill } from './skill.js';
import type { DiceResult } from '../tables/dice.js';

// State for a single career term during chargen
export interface CareerTerm {
  termNumber: number;
  careerId: string;
  assignmentId: string;
  age: number; // Age at start of term

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

export interface SpawnedEntity {
  type: 'npc' | 'location' | 'item' | 'secret';
  id: string; // Generated UUID
  relationship?: string;
  name?: string;
  description?: string;
  // Additional fields added during AI generation
  [key: string]: unknown;
}
