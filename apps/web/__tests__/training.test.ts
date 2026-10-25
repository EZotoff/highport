import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { getCareer } from '@highport/mgt2e';
import { createCharacter, getCharacter } from '../lib/chargen/state';
import { grantAdvancementTraining, grantBasicTraining } from '../lib/chargen/training';
import type { ChargenCharacter } from '../lib/chargen/types';

describe('mandatory career training', () => {
  let doc: Y.Doc;
  let character: ChargenCharacter;
  const career = getCareer('navy');
  if (!career) throw new Error('Missing fixture');
  beforeEach(() => {
    doc = new Y.Doc();
    const created = getCharacter(doc, createCharacter(doc, 'player', 'Hero'));
    if (!created) throw new Error('Missing character');
    character = { ...created, skills: {} };
  });
  afterEach(() => doc.destroy());

  it('grants service skills at level zero when entering the first career', () => {
    const skills = grantBasicTraining(character, career, true);
    for (const entry of career.skillTables.service) expect(skills[entry.skill]).toBe(0);
    expect(character.skills).toEqual({});
  });

  it('preserves existing higher levels and remains idempotent on repeated training', () => {
    const trained = { ...character, skills: { pilot: 2 } };
    const skills = grantBasicTraining(trained, career, true);
    expect(skills.pilot).toBe(2);
    expect(grantBasicTraining({ ...trained, skills }, career, true)).toEqual(skills);
  });

  it('leaves skills unchanged when entering a later career', () => {
    expect(grantBasicTraining(character, career, false)).toEqual(character.skills);
  });

  it('keeps alternative service training idempotent when repeated', () => {
    const army = getCareer('army');
    if (!army) throw new Error('Missing career');
    const skills = grantBasicTraining(character, army, true);
    expect(grantBasicTraining({ ...character, skills }, army, true)).toEqual(skills);
    expect(Object.keys(skills).every((skill) => !skill.includes('|'))).toBe(true);
  });

  it('marks a training roll pending when promotion grants training', () => {
    expect(grantAdvancementTraining()).toEqual({ trainingRollPending: true });
  });
});
