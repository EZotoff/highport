import { getSkills, roll1d6 } from '@highport/mgt2e';
import type { CharacteristicSet } from '@highport/mgt2e';
import type { ChargenCharacter, MusteringRoll } from './types';

export type ParsedBenefit =
  | { readonly type: 'characteristic'; readonly value: string }
  | { readonly type: 'characteristic-set'; readonly value: string }
  | { readonly type: 'shares'; readonly value: number; readonly dice?: boolean }
  | {
      readonly type: 'skill';
      readonly value: number;
      readonly skill: string;
      readonly qualifier?: string;
    }
  | {
      readonly type: 'item' | 'membership' | 'vehicle' | 'weapon' | 'other';
      readonly value: string;
    };

export type BenefitAlternative = ParsedBenefit & { readonly label: string };
export interface BenefitChoice {
  readonly alternatives: readonly BenefitAlternative[];
  readonly takeHigher: boolean;
  /** 'and' grants apply every part; 'or' grants require a player choice. */
  readonly mode: 'and' | 'or';
}

export function parseBenefit(benefit: string): ParsedBenefit {
  const bonus = benefit.match(/^\+(\d+)\s+(STR|DEX|END|INT|EDU|SOC)$/);
  if (bonus) return { type: 'characteristic', value: `${bonus[2]} +${bonus[1]}` };
  const fixed = benefit.match(/^(STR|DEX|END|INT|EDU|SOC)\s+(\d+)$/);
  if (fixed) return { type: 'characteristic-set', value: `${fixed[1]} ${fixed[2]}` };
  const shares = benefit.match(/^(?:(\d+D|\d+|Two)\s+)?Ship Shares?$/i);
  if (shares)
    return {
      type: 'shares',
      value: shares[1]?.toLowerCase() === 'two' ? 2 : parseInt(shares[1] ?? '1', 10),
      ...(shares[1]?.toLowerCase().endsWith('d') ? { dice: true } : {}),
    };
  const grant = benefit.match(/^(.+?)(?:\s+\(([^)]+)\))?\s+(\d+)$/);
  if (grant) {
    const skill = Object.values(getSkills()).find(
      (entry) => entry.name.toLowerCase() === grant[1].toLowerCase(),
    );
    if (skill)
      return { type: 'skill', skill: skill.id, qualifier: grant[2], value: Number(grant[3]) };
  }
  if (/^TAS(?: Membership)?$/.test(benefit)) return { type: 'membership', value: 'TAS Membership' };
  if (/^(Weapon|Gun|Blade)$/.test(benefit)) return { type: 'weapon', value: benefit };
  if (
    /^(Personal Vehicle|Vehicle|Yacht|Ship's Boat|Free Trader|Scout Ship|Lab Ship)$/.test(benefit)
  )
    return { type: 'vehicle', value: benefit };
  if (/^(Armour|Cybernetic Implant|Scientific Equipment)$/.test(benefit))
    return { type: 'item', value: benefit };
  return { type: 'other', value: benefit };
}

export function parseBenefitChoice(benefit: string): BenefitChoice {
  const source = benefit.replace(/,\s*whichever is higher$/i, '');
  if (!source.includes(' or ')) {
    const parts = source.split(' and ').map((label) => ({ ...parseBenefit(label), label }));
    if (parts.length > 1 && parts.every((part) => part.type !== 'other')) {
      return { alternatives: parts, takeHigher: false, mode: 'and' };
    }
  }
  const alternatives = source.split(' or ').map((label) => ({ ...parseBenefit(label), label }));
  if (
    alternatives.length > 1 &&
    alternatives.every((alternative) => alternative.type !== 'other')
  ) {
    return { alternatives, takeHigher: source !== benefit, mode: 'or' };
  }
  return {
    alternatives: [{ ...parseBenefit(benefit), label: benefit }],
    takeHigher: false,
    mode: 'or',
  };
}

export function applyCharacteristicBenefit(
  characteristics: CharacteristicSet,
  benefit: string,
): CharacteristicSet | null {
  const parsed = parseBenefit(benefit);
  switch (parsed.type) {
    case 'characteristic':
    case 'characteristic-set': {
      const [stat, amount] = parsed.value.split(' ');
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
              parsed.type === 'characteristic-set'
                ? Number(amount)
                : (typeof characteristics[stat] === 'number' ? characteristics[stat] : 0) +
                  Number(amount),
          };
        default:
          return null;
      }
    }
    case 'skill':
    case 'item':
    case 'shares':
    case 'membership':
    case 'vehicle':
    case 'weapon':
    case 'other':
      return null;
    default: {
      const unhandled: never = parsed;
      throw new RangeError(`Unknown benefit: ${unhandled}`);
    }
  }
}

export function resolveBenefitChoice(
  character: ChargenCharacter,
  choice: BenefitChoice,
): BenefitAlternative | null {
  if (choice.alternatives.length === 1) return choice.alternatives[0];
  if (!choice.takeHigher) return null;
  // CRB-per-reviewer: compare SOC 10 with current SOC + 1, not a floor followed by a bonus.
  return choice.alternatives.reduce((best, alternative) => {
    const bestStats = applyCharacteristicBenefit(character.characteristics, best.label);
    const nextStats = applyCharacteristicBenefit(character.characteristics, alternative.label);
    return (nextStats?.SOC ?? 0) > (bestStats?.SOC ?? 0) ? alternative : best;
  });
}

export function applyMusteringBenefit(
  character: ChargenCharacter,
  benefit: string,
  roll?: MusteringRoll,
): Partial<ChargenCharacter> {
  const choice = parseBenefitChoice(benefit);
  if (choice.mode === 'and' && choice.alternatives.length > 1) {
    const applied = choice.alternatives.reduce<ChargenCharacter>(
      (acc, part) => ({ ...acc, ...applyMusteringBenefit(acc, part.label) }),
      character,
    );
    // Record the full source once; replace only the per-part labels this fold appended.
    const benefits = [...applied.benefits.slice(0, character.benefits.length), benefit];
    const mustering = applied.mustering
      ? {
          ...applied.mustering,
          rollHistory: [...(applied.mustering.rollHistory ?? []), ...(roll ? [roll] : [])],
          benefits: [
            ...applied.mustering.benefits.slice(0, character.mustering?.benefits.length ?? 0),
            benefit,
          ],
        }
      : undefined;
    return {
      ...applied,
      benefits,
      ...(mustering ? { mustering } : {}),
    };
  }
  const parsed = parseBenefit(benefit);
  const current = character.mustering ?? {
    totalRolls: 0,
    rollsUsed: 0,
    cashRollsUsed: 0,
    benefits: [],
    credits: 0,
    shipShares: 0,
  };
  const characteristics = applyCharacteristicBenefit(character.characteristics, benefit);
  const record: MusteringRoll | undefined =
    roll ??
    (current.pendingBenefit
      ? {
          rollNumber: current.rollsUsed,
          type: 'benefit',
          roll: current.pendingBenefit.roll,
          result: benefit,
        }
      : undefined);
  const shareCount =
    parsed.type === 'shares'
      ? parsed.dice
        ? Array.from({ length: parsed.value }, () => roll1d6().total).reduce(
            (sum, value) => sum + value,
            0,
          )
        : parsed.value
      : 0;
  const updates: Partial<ChargenCharacter> = {
    benefits: [...character.benefits, benefit],
    mustering: {
      ...current,
      pendingBenefit: undefined,
      rollHistory: [...(current.rollHistory ?? []), ...(record ? [record] : [])],
      benefits: [...current.benefits, benefit],
      shipShares: current.shipShares + shareCount,
    },
    ...(characteristics ? { characteristics } : {}),
  };
  switch (parsed.type) {
    case 'skill': {
      const specialty = parsed.qualifier === 'any' ? undefined : parsed.qualifier;
      const key = specialty ? `${parsed.skill}.${specialty}` : parsed.skill;
      return {
        ...updates,
        skills: {
          ...character.skills,
          [parsed.skill]: character.skills[parsed.skill] ?? 0,
          [key]: Math.max(character.skills[key] ?? 0, parsed.value),
        },
      };
    }
    case 'characteristic':
    case 'characteristic-set':
    case 'shares':
    case 'item':
    case 'membership':
    case 'vehicle':
    case 'weapon':
    case 'other':
      return updates;
    default: {
      const unhandled: never = parsed;
      throw new RangeError(`Unknown benefit: ${unhandled}`);
    }
  }
}
