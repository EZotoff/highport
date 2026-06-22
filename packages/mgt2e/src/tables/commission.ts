import { getCharacteristicModifier } from '../types/characteristic.js';
import { type DiceResult, roll2d6 } from './dice.js';

export const COMMISSION_TARGET = 8;

export interface CommissionEligibility {
  eligible: boolean;
  reason?: string;
  modifier: number;
  socDM: number;
  termPenalty: number;
}

export function getCommissionModifier(
  soc: number,
  careerTermNumber: number,
): CommissionEligibility {
  const socDM = getCharacteristicModifier(soc);
  const termPenalty = soc >= 9 ? Math.max(0, careerTermNumber - 1) : 0;

  if (careerTermNumber > 1 && soc < 9) {
    return {
      eligible: false,
      reason: 'Commission may only be attempted in the first term unless SOC is 9+.',
      modifier: socDM,
      socDM,
      termPenalty: 0,
    };
  }

  return {
    eligible: true,
    modifier: socDM - termPenalty,
    socDM,
    termPenalty,
  };
}

export function rollCommission(soc: number, careerTermNumber: number): DiceResult {
  const { modifier } = getCommissionModifier(soc, careerTermNumber);
  return roll2d6(modifier, COMMISSION_TARGET);
}
