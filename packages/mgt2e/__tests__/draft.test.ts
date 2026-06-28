import { describe, expect, it, afterEach } from 'vitest';
import { resetRandomSeed, setRandomSeed } from '../src/tables/dice.js';
import { DRAFT_TABLE, getDraftCareerForRoll, rollDraftCareer } from '../src/tables/draft.js';

describe('Conscription draft table', () => {
  afterEach(() => {
    resetRandomSeed();
  });

  it('maps every 1d6 draft result to a draft-eligible career and excludes Drifter', () => {
    const rolls = DRAFT_TABLE.map((entry) => entry.roll);
    const careers = DRAFT_TABLE.map((entry) => entry.careerId);

    expect(rolls).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(careers)).toEqual(new Set(['army', 'marine', 'merchant', 'navy']));
    expect(careers).not.toContain('drifter');
  });

  it('returns the career for a valid draft roll and rejects invalid rolls', () => {
    expect(getDraftCareerForRoll(1)?.careerId).toBe('navy');
    expect(getDraftCareerForRoll(2)?.careerId).toBe('army');
    expect(getDraftCareerForRoll(3)?.careerId).toBe('marine');
    expect(getDraftCareerForRoll(4)?.careerId).toBe('merchant');
    expect(getDraftCareerForRoll(5)?.careerId).toBe('merchant');
    expect(getDraftCareerForRoll(6)?.careerId).toBe('merchant');
    expect(getDraftCareerForRoll(0)).toBeUndefined();
    expect(getDraftCareerForRoll(7)).toBeUndefined();
  });

  it('rolls 1d6 and preserves DiceResult.rolls while assigning the drafted career', () => {
    setRandomSeed(1234);

    const result = rollDraftCareer();

    expect(result.roll.dice).toBe('1d6');
    expect(result.roll.rolls).toEqual([1]);
    expect(result.roll.total).toBe(1);
    expect(result.careerId).toBe('navy');
  });
});
