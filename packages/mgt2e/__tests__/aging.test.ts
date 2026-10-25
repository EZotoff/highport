import { describe, expect, it } from 'vitest';
import { getAgingEffect, rollAgingCheck } from '../src/tables/aging.js';

describe('CRB 2e Ageing Table', () => {
  it.each([
    [-7, [2, 2, 2], 1],
    [-6, [2, 2, 2], 1],
    [-5, [2, 2, 2], 0],
    [-4, [2, 2, 1], 0],
    [-3, [2, 1, 1], 0],
    [-2, [1, 1, 1], 0],
    [-1, [1, 1], 0],
    [0, [1], 0],
    [1, [], 0],
    [12, [], 0],
  ])('allocates reduction slots when total is %s', (total, physicalReductions, mentalLosses) => {
    // Given an ageing total, when resolved, then slots preserve each CRB magnitude.
    expect(getAgingEffect(total)).toMatchObject({
      physicalReductions,
      physicalLosses: physicalReductions.length,
      mentalLosses,
    });
  });

  it('subtracts total terms without an Endurance DM when rolling ageing', () => {
    // Given four completed terms, when rolling, then the only DM is -4.
    expect(rollAgingCheck(4).roll.modifier).toBe(-4);
  });
});
