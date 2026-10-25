import { type DiceResult, roll2d6 } from './dice.js';

export type PhysicalCharacteristicCode = 'STR' | 'DEX' | 'END';
export type MentalCharacteristicCode = 'INT' | 'EDU' | 'SOC';

export type AgingEffectTier = 'severe' | 'moderate' | 'minor' | 'none';

export interface AgingEffect {
  tier: AgingEffectTier;
  physicalLosses: number;
  readonly physicalReductions: readonly number[];
  mentalLosses: number;
  description: string;
}

export interface AgingCheckResult extends AgingEffect {
  roll: DiceResult;
}

export function getAgingEffect(total: number): AgingEffect {
  // MGT2E CRB 2e, Ageing Table: 1+ none; 0/-1/-2: 1/2/3 physical by 1;
  // -3: 2,1,1; -4: 2,2,1; -5: 2,2,2; -6 or less: also one mental by 1.
  // Future work: anagathics.
  const physicalReductions =
    total >= 1
      ? []
      : total === 0
        ? [1]
        : total === -1
          ? [1, 1]
          : total === -2
            ? [1, 1, 1]
            : total === -3
              ? [2, 1, 1]
              : total === -4
                ? [2, 2, 1]
                : [2, 2, 2];
  const mentalLosses = total <= -6 ? 1 : 0;
  return {
    tier:
      physicalReductions.length === 0
        ? 'none'
        : physicalReductions.length === 1
          ? 'minor'
          : physicalReductions.length === 2
            ? 'moderate'
            : 'severe',
    physicalLosses: physicalReductions.length,
    physicalReductions,
    mentalLosses,
    description:
      physicalReductions.length === 0
        ? 'No effect.'
        : `Choose distinct physical characteristics to reduce by ${physicalReductions.join(', ')}${mentalLosses ? ', and one mental characteristic by 1' : ''}.`,
  };
}

export function rollAgingCheck(totalTermsCompleted: number): AgingCheckResult {
  const modifier = -totalTermsCompleted;
  const roll = roll2d6(modifier);
  const effect = getAgingEffect(roll.total);

  return {
    roll,
    ...effect,
  };
}
