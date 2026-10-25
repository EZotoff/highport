import {
  getAllSkillIds,
  getCareer,
  getCommissionModifier,
  type CareerEvent,
  type EventEffect,
} from '@highport/mgt2e';
import type { ChargenCharacter } from './types';
import { applySkillGain, resolveSkillTableEntry } from './term-resolution';

export function canConfirmEvent(event: CareerEvent, choiceId?: string): boolean {
  return !event.choices?.length || event.choices.some((choice) => choice.id === choiceId);
}

export function resolveEventEffects(character: ChargenCharacter, effects: readonly EventEffect[]) {
  let skills = { ...character.skills };
  const characteristics = { ...character.characteristics };
  const benefits = [...character.benefits];
  let eventAdvancementDM = 0;
  let autoPassNext: 'commission' | 'advancement' | undefined;

  for (const effect of effects) {
    const type = effect.type;
    switch (type) {
      case 'skill': {
        const resolved = resolveSkillTableEntry({
          roll: 1,
          skill: effect.target === 'any' ? getAllSkillIds().join('|') : effect.target,
        });
        for (let gain = 0; gain < Number(effect.value); gain += 1) {
          skills = applySkillGain(skills, resolved.skill, resolved.specialty);
        }
        break;
      }
      case 'characteristic': {
        const target = effect.target;
        switch (target) {
          case 'STR':
          case 'DEX':
          case 'END':
          case 'INT':
          case 'EDU':
          case 'SOC':
          case 'PSI':
            characteristics[target] =
              (typeof characteristics[target] === 'number' ? characteristics[target] : 0) +
              Number(effect.value);
            break;
          default:
            throw new RangeError(`Unknown event characteristic: ${target}`);
        }
        break;
      }
      case 'benefit':
        benefits.push(String(effect.value));
        break;
      case 'special':
        if (effect.target === 'next_advancement_dm') eventAdvancementDM += Number(effect.value);
        if (effect.target === 'next_promotion_or_commission' && effect.value === 'automatic_pass') {
          const term = character.terms[character.terms.length - 1];
          const career = term && getCareer(term.careerId);
          const careerTerms = character.terms.filter(
            (entry) => entry.careerId === term?.careerId,
          ).length;
          autoPassNext =
            career?.officerRanks &&
            !term.commissioned &&
            getCommissionModifier(character.characteristics.SOC, careerTerms).eligible
              ? 'commission'
              : 'advancement';
        }
        break;
      default: {
        const unhandled: never = type;
        throw new RangeError(`Unknown event effect: ${unhandled}`);
      }
    }
  }
  return { skills, characteristics, benefits, eventAdvancementDM, autoPassNext };
}
