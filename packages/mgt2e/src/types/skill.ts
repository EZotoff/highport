import type { CharacteristicCode } from './characteristic.js';

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
