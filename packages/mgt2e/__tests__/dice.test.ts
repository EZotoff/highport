import { afterEach, describe, expect, it } from 'vitest';
import {
  clearDiceOverrideInterceptor,
  resetRandomSeed,
  roll2d6,
  setDiceOverrideInterceptor,
} from '../src/tables/dice.js';

afterEach(() => {
  clearDiceOverrideInterceptor();
  resetRandomSeed();
});

describe('test-scoped dice injection', () => {
  it.each([true, false])('overrides totals when explicitly injected: %s', (success) => {
    setDiceOverrideInterceptor(({ target = 8 }) => ({
      total: success ? target : target - 1,
      success,
    }));
    expect(roll2d6(0, 8)).toMatchObject({ total: success ? 8 : 7, success });
  });

  it('restores ordinary dice when the interceptor is cleared', () => {
    setDiceOverrideInterceptor(() => ({ total: 100 }));
    clearDiceOverrideInterceptor();
    expect(roll2d6().total).toBeLessThanOrEqual(12);
  });
});
