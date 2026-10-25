import type { CareerDefinition } from '@highport/mgt2e';
import type { ChargenCharacter } from './types';
import { resolveSkillTableEntry } from './term-resolution';

export function grantBasicTraining(
  character: ChargenCharacter,
  career: CareerDefinition,
  isFirstCareer: boolean,
): Record<string, number> {
  const skills = { ...character.skills };
  if (!isFirstCareer) return skills;
  // MGT2E CRB 2e, Basic Training: first-career service skills at level 0; keep higher skills.
  for (const entry of career.skillTables.service) {
    const trainedAlternative = entry.skill.split('|').find((candidate) => candidate in skills);
    const resolved = resolveSkillTableEntry({ ...entry, skill: trainedAlternative ?? entry.skill });
    const key = resolved.specialty ? `${resolved.skill}.${resolved.specialty}` : resolved.skill;
    skills[key] ??= 0;
    if (resolved.specialty) skills[resolved.skill] ??= 0;
  }
  return skills;
}

export function grantAdvancementTraining() {
  return { trainingRollPending: true } as const;
}
