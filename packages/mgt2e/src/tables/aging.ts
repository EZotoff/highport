import { getCharacteristicModifier } from '../types/characteristic.js';
import { type DiceResult, roll2d6 } from './dice.js';

export type PhysicalCharacteristicCode = 'STR' | 'DEX' | 'END';
export type MentalCharacteristicCode = 'INT' | 'EDU' | 'SOC';

export type AgingEffectTier = 'severe' | 'moderate' | 'minor' | 'none';

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
  // CRB aging bands per rules review: <=0 / 1-2 / 3-5 / 6+.
  if (total <= 0) {
    return {
      tier: 'severe',
      physicalLosses: 3,
      mentalLosses: 0,
      description: 'Reduce STR, DEX and END by 1 each.',
    };
  }

  if (total <= 2) {
    return {
      tier: 'moderate',
      physicalLosses: 2,
      mentalLosses: 0,
      description: 'Reduce two physical characteristics by 1 each.',
    };
  }

  if (total <= 5) {
    return {
      tier: 'minor',
      physicalLosses: 1,
      mentalLosses: 0,
      description: 'Reduce one physical characteristic by 1.',
    };
  }

  return {
    tier: 'none',
    physicalLosses: 0,
    mentalLosses: 0,
    description: 'No effect.',
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
