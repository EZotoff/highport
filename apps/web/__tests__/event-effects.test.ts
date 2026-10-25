import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { getCareer, resetRandomSeed, setRandomSeed } from '@highport/mgt2e';
import { canConfirmEvent, resolveEventEffects } from '../lib/chargen/event-effects';
import { createCharacter, getCharacter } from '../lib/chargen/state';
import type { ChargenCharacter } from '../lib/chargen/types';

describe('event mechanical effects', () => {
  let doc: Y.Doc;
  let character: ChargenCharacter;
  beforeEach(() => {
    doc = new Y.Doc();
    const id = createCharacter(doc, 'player', 'Hero');
    const created = getCharacter(doc, id);
    if (!created) throw new Error('Missing fixture');
    character = {
      ...created,
      skills: {},
      benefits: [],
      characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    };
  });
  afterEach(() => {
    doc.destroy();
    resetRandomSeed();
  });

  it('grants a resolved skill when an event offers alternatives', () => {
    setRandomSeed(1);
    const patch = resolveEventEffects(character, [
      { type: 'skill', target: 'drive|flyer', value: 1 },
    ]);
    expect(Object.keys(patch.skills)).toHaveLength(1);
    expect(['drive', 'flyer']).toContain(Object.keys(patch.skills)[0]);
  });

  it('preserves specialties when an event grants a dotted skill', () => {
    expect(
      resolveEventEffects(character, [{ type: 'skill', target: 'tactics.naval', value: 1 }]).skills,
    ).toEqual({ tactics: 0, 'tactics.naval': 1 });
  });

  it('returns characteristic changes without mutating its input', () => {
    const effects = [{ type: 'characteristic', target: 'INT', value: 1 }] as const;
    expect(resolveEventEffects(character, effects).characteristics.INT).toBe(8);
    expect(resolveEventEffects(character, effects)).toEqual(
      resolveEventEffects(character, effects),
    );
    expect(character.characteristics.INT).toBe(7);
  });

  it('retains benefit values in the benefit ledger', () => {
    expect(
      resolveEventEffects(character, [
        { type: 'benefit', target: 'membership', value: 'TAS Membership' },
      ]).benefits,
    ).toEqual(['TAS Membership']);
  });

  it('accumulates advancement modifiers when multiple effects grant them', () => {
    expect(
      resolveEventEffects(character, [
        { type: 'special', target: 'next_advancement_dm', value: 2 },
        { type: 'special', target: 'next_advancement_dm', value: 4 },
      ]).eventAdvancementDM,
    ).toBe(6);
  });

  it('selects advancement when automatic promotion has no eligible commission', () => {
    expect(
      resolveEventEffects(character, [
        { type: 'special', target: 'next_promotion_or_commission', value: 'automatic_pass' },
      ]).autoPassNext,
    ).toBe('advancement');
  });

  it('requires explicit selection when an event has choices', () => {
    const event = getCareer('navy')?.events.find((entry) => entry.choices?.length);
    if (!event?.choices?.[0]) throw new Error('Missing choice fixture');
    expect(canConfirmEvent(event, undefined)).toBe(false);
    expect(canConfirmEvent(event, event.choices[0].id)).toBe(true);
    expect(canConfirmEvent(event, 'invalid')).toBe(false);
  });
});
