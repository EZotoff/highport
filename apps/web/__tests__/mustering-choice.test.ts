import { describe, expect, it } from 'vitest';
import { resetRandomSeed, setRandomSeed } from '@highport/mgt2e';
import {
  applyMusteringBenefit,
  parseBenefit,
  parseBenefitChoice,
  resolveBenefitChoice,
} from '../lib/chargen/mustering';
import type { ChargenCharacter } from '../lib/chargen/types';

const character: ChargenCharacter = {
  id: 'veteran',
  playerId: 'player',
  name: 'Veteran',
  characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  backgroundSkills: [],
  terms: [],
  chapters: [],
  currentTermIndex: 0,
  status: 'mustering_out',
  skills: {},
  benefits: [],
  credits: 0,
  age: 22,
  spawnedEntityIds: [],
};

describe('compound mustering benefits', () => {
  it.each([
    ['1D Ship Shares', 4],
    ['2D Ship Shares', 5],
  ] as const)('rolls dice-valued shares when given %s', (benefit, shares) => {
    // Given
    setRandomSeed(1);
    // When
    const updates = applyMusteringBenefit(character, benefit);
    resetRandomSeed();
    // Then
    expect(parseBenefit(benefit).type).toBe('shares');
    expect(updates.mustering?.shipShares).toBe(shares);
  });
  it.each([
    '+1 EDU or Two Ship Shares',
    '+1 END or Cybernetic Implant',
    'Armour or +1 END',
    'Personal Vehicle or Ship Share',
    "Ship's Boat or Two Ship Shares",
    'Gun Combat (any) 1 or Melee (blade) 1',
  ])('detects independently parseable alternatives when given %s', (source) => {
    // Given / When
    const choice = parseBenefitChoice(source);
    // Then
    expect(choice.alternatives).toHaveLength(2);
    expect(choice.alternatives.every((alternative) => alternative.type !== 'other')).toBe(true);
    expect(choice.takeHigher).toBe(false);
  });

  it('keeps the qualifier on the pair when given whichever is higher', () => {
    // Given / When
    const choice = parseBenefitChoice('SOC 10 or +1 SOC, whichever is higher');
    // Then
    expect(choice.takeHigher).toBe(true);
    expect(choice.alternatives.map((alternative) => alternative.label)).toEqual([
      'SOC 10',
      '+1 SOC',
    ]);
  });

  it.each(['Unknown or Weapon', 'Weapon or Unknown'])(
    'preserves an unparseable pair when given %s',
    (source) => {
      // Given / When / Then
      expect(parseBenefitChoice(source).alternatives).toHaveLength(1);
    },
  );

  it.each([
    ['+1 EDU', 'characteristic', 'EDU +1'],
    ['Two Ship Shares', 'shares', 2],
    ['3 Ship Shares', 'shares', 3],
    ['Ship Share', 'shares', 1],
    ['TAS Membership', 'membership', 'TAS Membership'],
    ['Weapon', 'weapon', 'Weapon'],
    ['Personal Vehicle', 'vehicle', 'Personal Vehicle'],
    ['Armour', 'item', 'Armour'],
  ])('retains the simple form when given %s', (source, type, value) => {
    // Given / When / Then
    expect(parseBenefit(String(source))).toMatchObject({ type, value });
    expect(parseBenefitChoice(String(source)).alternatives).toHaveLength(1);
  });

  it('parses a leveled skill when given an any qualifier', () => {
    // Given / When / Then
    expect(parseBenefit('Gun Combat (any) 1')).toMatchObject({
      type: 'skill',
      skill: 'guncombat',
      qualifier: 'any',
      value: 1,
    });
  });

  it('raises EDU exactly once when EDU is chosen', () => {
    // Given / When
    const updates = applyMusteringBenefit(character, '+1 EDU');
    // Then
    expect(updates.characteristics?.EDU).toBe(8);
    expect(updates.mustering?.shipShares).toBe(0);
    expect(updates.benefits).toEqual(['+1 EDU']);
  });

  it('adds two shares without raising EDU when shares are chosen', () => {
    // Given / When
    const updates = applyMusteringBenefit(character, 'Two Ship Shares');
    // Then
    expect(updates.mustering?.shipShares).toBe(2);
    expect(updates.characteristics?.EDU ?? character.characteristics.EDU).toBe(7);
  });

  it.each([
    [7, 'SOC 10', 10],
    [10, '+1 SOC', 11],
    [12, '+1 SOC', 13],
  ])('takes the higher resulting SOC when current SOC is %s', (soc, label, expected) => {
    // Given
    const veteran = { ...character, characteristics: { ...character.characteristics, SOC: soc } };
    // When
    const selected = resolveBenefitChoice(
      veteran,
      parseBenefitChoice('SOC 10 or +1 SOC, whichever is higher'),
    );
    // Then
    expect(selected?.label).toBe(label);
    expect(applyMusteringBenefit(veteran, selected?.label ?? '').characteristics?.SOC).toBe(
      expected,
    );
  });

  it.each([0, 2])('sets or preserves skill level when existing level is %s', (level) => {
    // Given
    const veteran = { ...character, skills: { 'melee.blade': level } };
    // When
    const updates = applyMusteringBenefit(veteran, 'Melee (blade) 1');
    // Then
    expect(updates.skills?.['melee.blade']).toBe(Math.max(level, 1));
  });

  it.each(['Armour', 'Cybernetic Implant', 'Personal Vehicle', "Ship's Boat"])(
    'records the selected material benefit when choosing %s',
    (benefit) => {
      // Given / When / Then
      expect(applyMusteringBenefit(character, benefit).benefits).toEqual([benefit]);
    },
  );
});
