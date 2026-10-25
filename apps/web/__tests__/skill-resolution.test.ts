import { afterEach, describe, expect, it } from 'vitest';
import { resetRandomSeed, setRandomSeed } from '@highport/mgt2e';
import {
  applySkillGain,
  parseCharacteristicBonus,
  resolveSkillTableEntry,
} from '../lib/chargen/term-resolution';

afterEach(resetRandomSeed);

describe('skill-table resolution', () => {
  it('grants one valid skill when the table offers alternatives', () => {
    setRandomSeed(1);
    const resolved = resolveSkillTableEntry({ roll: 1, skill: 'drive|flyer' });
    const skills = applySkillGain({}, resolved.skill, resolved.specialty);
    expect(['drive', 'flyer']).toContain(resolved.skill);
    expect(Object.keys(skills)).toHaveLength(1);
    expect(Object.keys(skills).every((key) => !key.includes('|'))).toBe(true);
  });

  it('preserves the specialty when granting a table skill', () => {
    const resolved = resolveSkillTableEntry({ roll: 1, skill: 'pilot', specialty: 'smallCraft' });
    expect(applySkillGain({}, resolved.skill, resolved.specialty)).toEqual({
      'pilot.smallCraft': 1,
      pilot: 0,
    });
  });

  it('routes characteristic entries to the existing parser', () => {
    const resolved = resolveSkillTableEntry({ roll: 1, skill: '+1 STR' });
    expect(parseCharacteristicBonus(resolved.skill)).toEqual({ stat: 'STR', value: 1 });
  });

  it('rejects unknown candidates when source data is invalid', () => {
    expect(() => resolveSkillTableEntry({ roll: 1, skill: 'bogus|alsobogus' })).toThrow(/bogus/);
  });
});
