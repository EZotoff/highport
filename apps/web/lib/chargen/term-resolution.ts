import {
  getCharacteristicModifier,
  getSkill,
  rollDie,
  roll2d6,
  type DiceResult,
  type CareerAssignment,
  type CareerDefinition,
  type SkillTableEntry,
} from '@highport/mgt2e';
import type { ChargenCharacter } from './types';

export class UnknownTableSkillError extends Error {
  constructor(readonly candidate: string) {
    super(`Unknown skill in table entry: ${candidate}`);
    this.name = 'UnknownTableSkillError';
  }
}

export function resolveSkillTableEntry(entry: SkillTableEntry): {
  readonly skill: string;
  readonly specialty?: string;
} {
  if (parseCharacteristicBonus(entry.skill)) return { skill: entry.skill };
  const alternatives = entry.skill.split('|');
  for (const candidate of alternatives) {
    if (!getSkill(candidate)) throw new UnknownTableSkillError(candidate);
  }
  const chosen =
    alternatives.length === 1 ? alternatives[0] : alternatives[rollDie(alternatives.length) - 1];
  return { skill: chosen, specialty: entry.specialty };
}

export function rollSurvival(
  character: ChargenCharacter,
  assignment: CareerAssignment,
  bonusDm: number = 0,
): DiceResult {
  const stat = assignment.survival.characteristic;
  const statValue = character.characteristics[stat] || 0;
  const dm = getCharacteristicModifier(statValue) + bonusDm;
  return roll2d6(dm, assignment.survival.target);
}

export function rollAdvancement(
  character: ChargenCharacter,
  assignment: CareerAssignment,
  eventBonus: number = 0,
): DiceResult {
  const stat = assignment.advancement.characteristic;
  const statValue = character.characteristics[stat] || 0;
  const dm = getCharacteristicModifier(statValue) + eventBonus;
  return roll2d6(dm, assignment.advancement.target);
}

export function applySkillGain(
  currentSkills: Record<string, number>,
  skill: string,
  specialty?: string,
): Record<string, number> {
  const skillKey = specialty ? `${skill}.${specialty}` : skill;
  const newSkills = { ...currentSkills };
  newSkills[skillKey] = (newSkills[skillKey] || 0) + 1;

  if (specialty && !(skill in newSkills)) {
    newSkills[skill] = 0;
  }
  return newSkills;
}

export function getRankInfo(
  career: CareerDefinition,
  rankLevel: number,
  isOfficer: boolean = false,
): { title: string; skill?: string; skillLevel?: number } | null {
  const ranks = isOfficer ? career.officerRanks : career.ranks;
  if (!ranks) return null;
  return ranks.find((r) => r.rank === rankLevel) || null;
}

export function parseCharacteristicBonus(skill: string): { stat: string; value: number } | null {
  const match = skill.match(/^\+(\d+)\s+(STR|DEX|END|INT|EDU|SOC)$/);
  if (!match) return null;
  return { stat: match[2], value: parseInt(match[1], 10) };
}
