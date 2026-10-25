import { afterEach, expect, it } from 'vitest';
import { getCareer } from '../src/data/careers/index.js';
import { rollMusteringBenefit } from '../src/tables/benefits.js';
import { clearDiceOverrideInterceptor, setDiceOverrideInterceptor } from '../src/tables/dice.js';

afterEach(clearDiceOverrideInterceptor);

it('offers both Agent benefits when roll six is selected without a rank gate', () => {
  // Given Agent roll six, when rolling, then both alternatives remain player choices.
  const career = getCareer('agent');
  if (!career) throw new Error('Missing Agent fixture');
  setDiceOverrideInterceptor(() => ({ total: 6 }));
  expect(rollMusteringBenefit(career).benefit).toBe('SOC +1 or Combat Implant');
});
