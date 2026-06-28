import type { DiceResult } from './dice.js';
import { roll1d6 } from './dice.js';

export type DraftCareerId = 'army' | 'marine' | 'merchant' | 'navy';

export interface DraftTableEntry {
  roll: number;
  careerId: DraftCareerId;
}

export interface DraftResult {
  roll: DiceResult;
  careerId: DraftCareerId;
}

export const DRAFT_TABLE: readonly DraftTableEntry[] = [
  { roll: 1, careerId: 'navy' },
  { roll: 2, careerId: 'army' },
  { roll: 3, careerId: 'marine' },
  { roll: 4, careerId: 'merchant' },
  { roll: 5, careerId: 'merchant' },
  { roll: 6, careerId: 'merchant' },
] as const;

export function getDraftCareerForRoll(roll: number): DraftTableEntry | undefined {
  return DRAFT_TABLE.find((entry) => entry.roll === roll);
}

export function rollDraftCareer(): DraftResult {
  const roll = roll1d6();
  const entry = getDraftCareerForRoll(roll.total);
  if (!entry) {
    throw new RangeError(`Draft roll ${roll.total} is outside the 1d6 draft table.`);
  }

  return {
    roll,
    careerId: entry.careerId,
  };
}
