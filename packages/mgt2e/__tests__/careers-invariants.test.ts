import { describe, expect, it } from 'vitest';
import { SRD_CAREERS } from '../src/data/srd/careers.js';
import { SRD_SKILLS } from '../src/data/srd/skills.js';
import { resetRandomSeed, roll2d6, setRandomSeed } from '../src/tables/dice.js';
import type { CareerDefinition, SkillTableEntry } from '../src/types/career.js';
import type { CareerEvent, CareerMishap } from '../src/types/event.js';

const characteristicCodes = new Set(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC', 'PSI']);
const oneD6Rolls = [1, 2, 3, 4, 5, 6];
const twoD6Rolls = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const benefitRolls = [1, 2, 3, 4, 5, 6, 7];
const dangerousVerbatimPhrases = [
  'Disaster! Roll on the Mishap table',
  'Life Event. Roll on the Life Events table.',
  'You find something of value.',
  'You find temporary work.',
] as const;

const careers = Object.values(SRD_CAREERS);
const skillIds = new Set(Object.keys(SRD_SKILLS));

function expectConsecutiveRolls(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  expect([...actual].sort((a, b) => a - b)).toEqual(expected);
}

function expectText(value: string): void {
  expect(value.trim()).toBe(value);
  expect(value.length).toBeGreaterThan(0);
}

function expectSkillReference(skill: string, specialty?: string): void {
  const characteristicGain = skill.match(/^\+\d+ (STR|DEX|END|INT|EDU|SOC|PSI)$/);
  if (characteristicGain) {
    return;
  }

  for (const candidate of skill.split('|')) {
    expect(skillIds.has(candidate), `${candidate} should exist in master skills`).toBe(true);
    const definition = SRD_SKILLS[candidate];
    if (specialty && definition?.specialties) {
      expect(
        definition.specialties.some((candidateSpecialty) => candidateSpecialty.id === specialty),
        `${candidate}.${specialty} should exist in master skill specialties`,
      ).toBe(true);
    }
  }
}

function expectSkillTable(table: readonly SkillTableEntry[], context: string): void {
  expect(table, `${context} should have six 1d6 rows`).toHaveLength(6);
  expectConsecutiveRolls(
    table.map((entry) => entry.roll),
    oneD6Rolls,
  );
  for (const entry of table) {
    expectText(entry.skill);
    expectSkillReference(entry.skill, entry.specialty);
  }
}

function expectEvent(event: CareerEvent): void {
  expect(twoD6Rolls).toContain(event.roll);
  expectText(event.description);
  for (const choice of event.choices ?? []) {
    expectText(choice.id);
    expectText(choice.description);
    expect(Array.isArray(choice.effects)).toBe(true);
  }
}

function expectMishap(mishap: CareerMishap): void {
  expect(oneD6Rolls).toContain(mishap.roll);
  expectText(mishap.description);
  expect(typeof mishap.injury).toBe('boolean');
  expect(typeof mishap.forced).toBe('boolean');
}

function expectCareerSchema(career: CareerDefinition): void {
  expectText(career.id);
  expectText(career.name);
  expectText(career.description);
  expect(characteristicCodes.has(career.qualification.characteristic)).toBe(true);
  expect(career.qualification.target).toBeGreaterThanOrEqual(0);
  expect(career.qualification.target).toBeLessThanOrEqual(12);

  expect(career.assignments).toHaveLength(3);
  for (const assignment of career.assignments) {
    expectText(assignment.id);
    expectText(assignment.name);
    expectText(assignment.description);
    expect(characteristicCodes.has(assignment.survival.characteristic)).toBe(true);
    expect(characteristicCodes.has(assignment.advancement.characteristic)).toBe(true);
    expect(assignment.survival.target).toBeGreaterThanOrEqual(2);
    expect(assignment.survival.target).toBeLessThanOrEqual(12);
    expect(assignment.advancement.target).toBeGreaterThanOrEqual(2);
    expect(assignment.advancement.target).toBeLessThanOrEqual(12);
    expectSkillTable(assignment.skillTable, `${career.id}.${assignment.id}.skillTable`);
  }

  expectSkillTable(career.skillTables.personal, `${career.id}.personal`);
  expectSkillTable(career.skillTables.service, `${career.id}.service`);
  expectSkillTable(career.skillTables.advanced, `${career.id}.advanced`);
  if (career.skillTables.officer) {
    expectSkillTable(career.skillTables.officer, `${career.id}.officer`);
  }

  expect(career.cashBenefits).toHaveLength(7);
  expect(career.benefitTable).toHaveLength(7);
  expectConsecutiveRolls(
    career.benefitTable.map((entry) => entry.roll),
    benefitRolls,
  );

  expectConsecutiveRolls(
    career.events.map((event) => event.roll),
    twoD6Rolls,
  );
  career.events.forEach(expectEvent);
  expectConsecutiveRolls(
    career.mishaps.map((mishap) => mishap.roll),
    oneD6Rolls,
  );
  career.mishaps.forEach(expectMishap);
}

describe('SRD career data invariants', () => {
  it('validates every shipped career schema when loading the SRD registry', () => {
    expect(careers).toHaveLength(12);
    for (const career of careers) {
      expectCareerSchema(career);
    }
  });

  it('keeps career and assignment identifiers unique', () => {
    const careerIds = careers.map((career) => career.id);
    expect(new Set(careerIds).size).toBe(12);
    for (const career of careers) {
      const assignmentIds = career.assignments.map((assignment) => assignment.id);
      expect(new Set(assignmentIds).size).toBe(3);
    }
  });

  it('keeps rank tracks and officer tracks internally consistent', () => {
    for (const career of careers) {
      expectConsecutiveRolls(
        [...new Set(career.ranks.map((rank) => rank.rank))],
        [0, 1, 2, 3, 4, 5, 6],
      );
      for (const rank of career.ranks) {
        expectText(rank.title);
        if (rank.skill) expectSkillReference(rank.skill, rank.specialty);
      }

      expect(Boolean(career.officerRanks)).toBe(Boolean(career.skillTables.officer));
      if (career.officerRanks) {
        expectConsecutiveRolls(
          career.officerRanks.map((rank) => rank.rank),
          [1, 2, 3, 4, 5, 6],
        );
      }
    }
  });

  it('keeps paraphrased career text away from known unsafe source phrases', () => {
    const searchableText = careers
      .flatMap((career) => [
        career.description,
        ...career.assignments.map((assignment) => assignment.description),
        ...career.events.map((event) => event.description),
        ...career.mishaps.map((mishap) => mishap.description),
      ])
      .join('\n');

    for (const phrase of dangerousVerbatimPhrases) {
      expect(searchableText).not.toContain(phrase);
    }
  });

  it('produces deterministic survival dice with a seeded RNG', () => {
    const scout = SRD_CAREERS.scout;
    const assignment = scout.assignments[0];

    setRandomSeed(1234);
    const result = roll2d6(0, assignment.survival.target);
    resetRandomSeed();

    expect(result.dice).toBe('2d6');
    expect(result.rolls).toEqual([1, 5]);
    expect(result.total).toBe(6);
    expect(result.target).toBe(5);
    expect(result.success).toBe(true);
  });
});
