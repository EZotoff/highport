import { getCharacteristicModifier } from '../types/characteristic.js';
import { type DiceResult, roll2d6 } from './dice.js';

export type PhysicalCharacteristicCode = 'STR' | 'DEX' | 'END';
export type MentalCharacteristicCode = 'INT' | 'EDU' | 'SOC';

export type AgingEffectTier =
  | 'none_low'
  | 'minor_physical'
  | 'moderate_physical'
  | 'physical_mental'
  | 'none_high';

export interface AgingEffect {
  tier: AgingEffectTier;
  physicalLosses: number;
  mentalLosses: number;
  description: string;
}

export interface AgingCheckResult extends AgingEffect {
  roll: DiceResult;
}

export function getAgingEffect(total: number): AgingEffect {
  if (total <= 0) {
    return {
      tier: 'none_low',
      physicalLosses: 0,
      mentalLosses: 0,
      description: 'No effect.',
    };
  }

  if (total <= 5) {
    return {
      tier: 'minor_physical',
      physicalLosses: 1,
      mentalLosses: 0,
      description: 'Reduce one physical characteristic by 1.',
    };
  }

  if (total <= 8) {
    return {
      tier: 'moderate_physical',
      physicalLosses: 2,
      mentalLosses: 0,
      description: 'Reduce two physical characteristics by 1 each.',
    };
  }

  if (total <= 10) {
    return {
      tier: 'physical_mental',
      physicalLosses: 1,
      mentalLosses: 1,
      description:
        'Reduce one physical characteristic and one mental/social characteristic by 1 each.',
    };
  }

  return {
    tier: 'none_high',
    physicalLosses: 0,
    mentalLosses: 0,
    description: 'No effect due to superior physical conditioning.',
  };
}

export function rollAgingCheck(endurance: number, totalTermsCompleted: number): AgingCheckResult {
  const modifier = getCharacteristicModifier(endurance) - totalTermsCompleted;
  const roll = roll2d6(modifier);
  const effect = getAgingEffect(roll.total);

  return {
    roll,
    ...effect,
  };
}
