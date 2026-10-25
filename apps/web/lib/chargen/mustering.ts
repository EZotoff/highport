import {
  getCareer,
  roll1d6,
  rollCashBenefit,
  rollMusteringBenefit,
  getCharacteristicModifier,
} from '@highport/mgt2e';
import type { CareerDefinition, CharacteristicSet, DiceResult } from '@highport/mgt2e';
import type { ChargenCharacter, MusteringState } from './types';

export function calculateTotalBenefitRolls(character: ChargenCharacter): number {
  const terms = character.terms.filter((term) => term.survived === true).length;
  const finalTerm = character.terms[character.terms.length - 1];
  const finalRank = finalTerm?.currentRank || 0;

  // CRB per rules review: rank 0-1/+0, 2-3/+1, 4-5/+2, 6/+3.
  const rankBonus = finalRank >= 6 ? 3 : finalRank >= 4 ? 2 : finalRank >= 2 ? 1 : 0;
  return terms + rankBonus;
}

export function getBenefitRollDM(finalRank: number): number {
  // CRB per rules review: rank 5+ adds +1 to benefits, not cash.
  return finalRank >= 5 ? 1 : 0;
}

export function isHighRank(character: ChargenCharacter): boolean {
  const finalTerm = character.terms[character.terms.length - 1];
  return (finalTerm?.currentRank || 0) >= 5;
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
  isHighRankAlternate?: boolean;
}

export function rollBenefit(
  character: ChargenCharacter,
  type: 'cash' | 'benefit',
): BenefitRollResult {
  const career = getCareer(character.terms[character.terms.length - 1]?.careerId || '');
  if (!career) throw new Error('Career not found');

  if (type === 'cash') {
    const gamblingBonus = getGamblingBonus(character);
    const result = rollCashBenefit(career, gamblingBonus);
    return {
      type: 'cash',
      roll: result.roll,
      result: result.cash || 0,
    };
  } else {
    const highRank = isHighRank(character);
    const finalRank = character.terms[character.terms.length - 1]?.currentRank ?? 0;
    const result = rollMusteringBenefit(career, getBenefitRollDM(finalRank), highRank);
    return {
      type: 'benefit',
      roll: result.roll,
      result: result.benefit || '',
      isHighRankAlternate: highRank && result.benefit?.includes('High Rank'),
    };
  }
}

// Parse benefit string to determine type
export function parseBenefit(benefit: string): {
  type: 'characteristic' | 'item' | 'shares' | 'membership' | 'vehicle' | 'weapon' | 'other';
  value: string | number;
} {
  // Characteristic bonus: "+1 INT", "+1 EDU", etc.
  const charMatch = benefit.match(/^\+(\d+)\s+(STR|DEX|END|INT|EDU|SOC)$/);
  if (charMatch) {
    return { type: 'characteristic', value: `${charMatch[2]} +${charMatch[1]}` };
  }

  // Ship shares
  if (benefit.includes('Ship Share')) {
    const shareMatch = benefit.match(/(\d+)\s*Ship\s*Share/i);
    return { type: 'shares', value: shareMatch ? parseInt(shareMatch[1]) : 1 };
  }

  // Common benefits
  if (benefit.includes('TAS')) return { type: 'membership', value: 'TAS Membership' };
  if (benefit.includes('Weapon')) return { type: 'weapon', value: benefit };
  if (benefit.includes('Vehicle') || benefit.includes('Yacht'))
    return { type: 'vehicle', value: benefit };

  return { type: 'other', value: benefit };
}

export function applyCharacteristicBenefit(
  characteristics: CharacteristicSet,
  benefit: string,
): CharacteristicSet | null {
  const parsed = parseBenefit(benefit);
  const type = parsed.type;
  switch (type) {
    case 'characteristic': {
      const [stat, bonus] = String(parsed.value).split(' ');
      switch (stat) {
        case 'STR':
        case 'DEX':
        case 'END':
        case 'INT':
        case 'EDU':
        case 'SOC':
          return {
            ...characteristics,
            [stat]:
              (typeof characteristics[stat] === 'number' ? characteristics[stat] : 0) +
              Number(bonus),
          };
        default:
          return null;
      }
    }
    case 'item':
    case 'shares':
    case 'membership':
    case 'vehicle':
    case 'weapon':
    case 'other':
      return null;
    default: {
      const unhandled: never = type;
      throw new RangeError(`Unknown benefit type: ${unhandled}`);
    }
  }
}
