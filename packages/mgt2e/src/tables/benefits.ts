import type { CareerDefinition, BenefitEntry } from '../types/career.js';
import type { DiceResult } from './dice.js';
import { roll1d6 } from './dice.js';

export interface BenefitRollResult {
  roll: DiceResult;
  cash?: number;
  benefit?: string;
}

export function rollCashBenefit(
  career: CareerDefinition,
  gamblingBonus: number = 0,
): BenefitRollResult {
  const result = roll1d6(gamblingBonus);
  // Clamp to valid index (1-7 maps to index 0-6)
  const index = Math.min(Math.max(result.total, 1), career.cashBenefits.length) - 1;
  const cash = career.cashBenefits[index];

  return { roll: result, cash };
}

export function rollMusteringBenefit(
  career: CareerDefinition,
  modifier: number = 0,
  isHighRank: boolean = false,
): BenefitRollResult {
  const result = roll1d6(modifier);
  // Clamp to valid index (1-6 maps to index 0-5, or 1-7 to 0-6)
  const index = Math.min(Math.max(result.total, 1), career.benefitTable.length) - 1;
  const entry = career.benefitTable[index];

  // High rank (5+) may get alternate benefit
  const benefit = isHighRank && entry.orHighRank ? entry.orHighRank : entry.benefit;

  return { roll: result, benefit };
}

export function getCashBenefit(career: CareerDefinition, rollValue: number): number {
  const index = Math.min(Math.max(rollValue, 1), career.cashBenefits.length) - 1;
  return career.cashBenefits[index];
}

export function getBenefitEntry(career: CareerDefinition, rollValue: number): BenefitEntry {
  const index = Math.min(Math.max(rollValue, 1), career.benefitTable.length) - 1;
  return career.benefitTable[index];
}
