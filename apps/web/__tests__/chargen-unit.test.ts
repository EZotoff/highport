import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CareerAssignment } from '@highport/mgt2e';
import { getCharacteristicModifier, setRandomSeed, resetRandomSeed } from '@highport/mgt2e';
import { rollInitialCharacteristics, createCharacter } from '../lib/chargen/state';
import { rollSurvival, rollAdvancement, applySkillGain } from '../lib/chargen/term-resolution';
import { calculateTotalBenefitRolls, isHighRank } from '../lib/chargen/mustering';
import type { CareerTermResult, ChargenCharacter } from '../lib/chargen/types';
import * as Y from 'yjs';

function makeTerm(termNumber: number, currentRank: number): CareerTermResult {
  return {
    termNumber,
    careerId: 'navy',
    assignmentId: 'line-captain',
    startAge: 18 + (termNumber - 1) * 4,
    survived: true,
    advanced: false,
    currentRank,
    skillsGained: [],
    spawnedEntities: [],
  };
}

function makeCharacter(overrides: Partial<ChargenCharacter> = {}): ChargenCharacter {
  return {
    id: 'char-1',
    playerId: 'player-1',
    name: 'Test Character',
    characteristics: {
      STR: 11,
      DEX: 8,
      END: 7,
      INT: 14,
      EDU: 9,
      SOC: 6,
    },
    backgroundSkills: [],
    terms: [makeTerm(1, 0)],
    chapters: [],
    currentTermIndex: 0,
    status: 'term_resolution',
    skills: {},
    benefits: [],
    credits: 0,
    age: 22,
    spawnedEntityIds: [],
    ...overrides,
  };
}

describe('Character creation unit flows', () => {
  describe('Characteristic roll generation', () => {
    beforeEach(() => {
      setRandomSeed(42);
    });

    afterEach(() => {
      resetRandomSeed();
    });

    it('generates six stats in 2-12 range and is deterministic with same seed', () => {
      const first = rollInitialCharacteristics();

      resetRandomSeed();
      setRandomSeed(42);
      const second = rollInitialCharacteristics();

      expect(first).toEqual(second);

      const values = [first.STR, first.DEX, first.END, first.INT, first.EDU, first.SOC];
      expect(values).toHaveLength(6);
      values.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(12);
      });
    });

    it('can create a character with real state implementation', () => {
      const doc = new Y.Doc();
      const id = createCharacter(doc, 'player-1', 'Ari');
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      doc.destroy();
    });
  });

  describe('Qualification DM calculation', () => {
    it('maps all breakpoint values from 0 through 15', () => {
      const expected = [-3, -2, -2, -1, -1, -1, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3];

      for (let value = 0; value <= 15; value += 1) {
        expect(getCharacteristicModifier(value)).toBe(expected[value]);
      }
    });
  });

  describe('Term resolution logic', () => {
    afterEach(() => {
      resetRandomSeed();
    });

    it('rollSurvival returns deterministic DiceResult structure with stat DM', () => {
      const character = makeCharacter();
      const assignment: CareerAssignment = {
        id: 'line',
        name: 'Line',
        description: 'Line duty',
        survival: { characteristic: 'STR', target: 8 },
        advancement: { characteristic: 'INT', target: 10 },
        skillTable: [],
      };

      setRandomSeed(7);
      const result = rollSurvival(character, assignment);

      expect(result.dice).toBe('2d6');
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(1);
      expect(result.target).toBe(8);
      expect(result.success).toBe(result.total >= 8);
    });

    it('rollAdvancement includes characteristic DM plus event bonus', () => {
      const character = makeCharacter();
      const assignment: CareerAssignment = {
        id: 'line',
        name: 'Line',
        description: 'Line duty',
        survival: { characteristic: 'STR', target: 8 },
        advancement: { characteristic: 'INT', target: 10 },
        skillTable: [],
      };

      setRandomSeed(9);
      const result = rollAdvancement(character, assignment, 1);

      expect(result.dice).toBe('2d6');
      expect(result.rolls).toHaveLength(2);
      expect(result.modifier).toBe(3);
      expect(result.target).toBe(10);
      expect(result.success).toBe(result.total >= 10);
    });
  });

  describe('Benefit roll counting', () => {
    it('counts terms and rank without high-rank bonus below rank 5', () => {
      const character = makeCharacter({ terms: [makeTerm(1, 0)] });
      expect(calculateTotalBenefitRolls(character)).toBe(1);
      expect(isHighRank(character)).toBe(false);
    });

    it('adds high-rank bonus when final rank is 5 or above', () => {
      const character = makeCharacter({
        terms: [makeTerm(1, 0), makeTerm(2, 2), makeTerm(3, 5)],
      });
      expect(calculateTotalBenefitRolls(character)).toBe(9);
      expect(isHighRank(character)).toBe(true);
    });
  });

  describe('Skill accumulation', () => {
    it('adds new skills, increments existing skills, and creates base skill for specialty', () => {
      const gainedNew = applySkillGain({}, 'mechanic');
      expect(gainedNew.mechanic).toBe(1);

      const gainedExisting = applySkillGain({ mechanic: 1 }, 'mechanic');
      expect(gainedExisting.mechanic).toBe(2);

      const gainedSpecialty = applySkillGain({}, 'science', 'physics');
      expect(gainedSpecialty['science.physics']).toBe(1);
      expect(gainedSpecialty.science).toBe(0);
    });
  });
});
