import type { CharacteristicCode } from './characteristic.js';
import type { CareerEvent, CareerMishap } from './event.js';

export interface CareerDefinition {
  id: string;
  name: string;
  description: string;

  // Qualification
  qualification: {
    characteristic: CharacteristicCode;
    target: number;
    previousCareerPenalty?: number; // DM per previous career (usually -1)
  };

  // Assignments within the career
  assignments: CareerAssignment[];

  // Skill tables (shared across assignments)
  skillTables: {
    personal: SkillTableEntry[];
    service: SkillTableEntry[];
    advanced: SkillTableEntry[];
    officer?: SkillTableEntry[]; // Only for military careers with commission
  };

  // Rank structure
  ranks: CareerRank[];
  officerRanks?: CareerRank[]; // Separate officer track

  // Benefits
  cashBenefits: number[]; // 1-7 on cash table (index 0-6)
  benefitTable: BenefitEntry[]; // 1-7 on benefits table (index 0-6)

  // Events and mishaps
  events: CareerEvent[]; // 2-12 on 2d6
  flavorTemplates?: Record<string, string[]>;
  mishaps: CareerMishap[]; // 1-6 on 1d6
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
  skillTable: SkillTableEntry[]; // Assignment-specific skill table
}

export interface CareerRank {
  rank: number;
  title: string;
  skill?: string; // Automatic skill gain at this rank
  skillLevel?: number; // Level of automatic skill
  specialty?: string; // Specialty if skill has specialties
  benefit?: string; // Non-skill benefit (e.g., "TAS Membership")
}

export interface SkillTableEntry {
  roll: number; // 1-6 on 1d6
  skill: string; // Skill ID or "+1 [characteristic]"
  specialty?: string; // Specialty if skill has specialties
}

export interface BenefitEntry {
  roll: number;
  benefit: string;
  orHighRank?: string; // Alternative if rank 5+
}
