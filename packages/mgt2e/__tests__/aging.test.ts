import { describe, expect, it } from 'vitest';
import { getAgingEffect } from '../src/tables/aging.js';

describe('CRB aging bands per rules review', () => {
  it.each([
    [-2, 'severe', 3],
    [0, 'severe', 3],
    [1, 'moderate', 2],
    [2, 'moderate', 2],
    [3, 'minor', 1],
    [5, 'minor', 1],
    [6, 'none', 0],
    [12, 'none', 0],
  ])('applies the physical-loss band when total is %s', (total, tier, losses) => {
    // Given an aging total, when its effect is resolved, then only physical losses apply.
    expect(getAgingEffect(Number(total))).toMatchObject({
      tier,
      physicalLosses: losses,
      mentalLosses: 0,
    });
  });
});
