export {
  parseBenefit,
  parseBenefitChoice,
  applyCharacteristicBenefit,
  applyMusteringBenefit,
  resolveBenefitChoice,
} from './mustering-benefits';
import { getCareer, rollCashBenefit, rollMusteringBenefit } from '@highport/mgt2e';
import type { DiceResult } from '@highport/mgt2e';
import type { ChargenCharacter } from './types';

export const MAX_CASH_ROLLS = 3;

export function getCareerBenefitRolls(character: ChargenCharacter) {
  // MGT2E CRB 2e, Benefits: full terms (no mishap) plus highest rank per career:
  // rank 1-2/+1, 3-4/+2, 5-6/+3. Future work: pensions at five or more terms.
  return [...new Set(character.terms.map((term) => term.careerId))].map((careerId) => {
    const terms = character.terms.filter((term) => term.careerId === careerId);
    const rank = Math.max(0, ...terms.map((term) => term.currentRank));
    const rolls =
      terms.filter((term) => term.survived && !term.mishap).length +
      (rank >= 5 ? 3 : rank >= 3 ? 2 : rank >= 1 ? 1 : 0);
    return { careerId, rank, rolls };
  });
}

export function calculateTotalBenefitRolls(character: ChargenCharacter): number {
  return getCareerBenefitRolls(character).reduce((total, career) => total + career.rolls, 0);
}

export function getMusteringCareer(character: ChargenCharacter) {
  let used = character.mustering?.rollsUsed ?? 0;
  for (const career of getCareerBenefitRolls(character)) {
    if (used < career.rolls) return career;
    used -= career.rolls;
  }
  return undefined;
}

export function getBenefitRollDM(finalRank: number): number {
  // MGT2E CRB 2e, Benefits: rank 5-6 grants DM+1 to both Cash and Benefits.
  return finalRank >= 5 ? 1 : 0;
}

export function isHighRank(character: ChargenCharacter): boolean {
  return (getMusteringCareer(character)?.rank ?? 0) >= 5;
}

export function getGamblingBonus(character: ChargenCharacter): number {
  // Gambler skill adds to cash table rolls
  const gamblerLevel = character.skills['gambler'] || 0;
  return gamblerLevel;
}

export interface BenefitRollResult {
  type: 'cash' | 'benefit';
  roll: DiceResult;
  result: string | number;
}

export class CashRollLimitError extends Error {
  constructor() {
    super('Cash rolls are limited to three across all careers');
  }
}

export function rollBenefit(
  character: ChargenCharacter,
  type: 'cash' | 'benefit',
): BenefitRollResult {
  if (type === 'cash' && (character.mustering?.cashRollsUsed ?? 0) >= MAX_CASH_ROLLS) {
    throw new CashRollLimitError();
  }
  const allocation = getMusteringCareer(character);
  const career = getCareer(allocation?.careerId ?? '');
  if (!career) throw new Error('Career not found');

  if (type === 'cash') {
    const gamblingBonus = getGamblingBonus(character);
    const result = rollCashBenefit(career, gamblingBonus + getBenefitRollDM(allocation?.rank ?? 0));
    return {
      type: 'cash',
      roll: result.roll,
      result: result.cash || 0,
    };
  } else {
    const result = rollMusteringBenefit(career, getBenefitRollDM(allocation?.rank ?? 0));
    return {
      type: 'benefit',
      roll: result.roll,
      result: result.benefit || '',
    };
  }
}
