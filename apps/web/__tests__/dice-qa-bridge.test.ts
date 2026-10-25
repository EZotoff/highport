import { afterEach, expect, it, vi } from 'vitest';
import { clearDiceOverrideInterceptor, roll2d6 } from '@highport/mgt2e';
import { installDiceQABridge } from '../lib/qa/dice-qa-bridge';

afterEach(() => {
  clearDiceOverrideInterceptor();
  delete window.__qaForceRollSuccess;
  delete window.__qaForceRollFailure;
  vi.unstubAllEnvs();
});

it('ignores window flags without installing the bridge', () => {
  window.__qaForceRollSuccess = true;
  const result = roll2d6(-20, 8);
  expect(result.success).toBe(false);
  expect(result.total).toBe(result.rolls.reduce((sum, die) => sum + die, -20));
});

it.each([
  ['production', '1'],
  ['development', '0'],
])('leaves dice untouched with %s and QA=%s', (mode, hooks) => {
  vi.stubEnv('NODE_ENV', mode);
  vi.stubEnv('NEXT_PUBLIC_QA_HOOKS', hooks);
  window.__qaForceRollSuccess = true;
  installDiceQABridge();
  expect(roll2d6(-20, 8).success).toBe(false);
});

it('forces targeted rolls only when the dev bridge is enabled', () => {
  vi.stubEnv('NODE_ENV', 'development');
  vi.stubEnv('NEXT_PUBLIC_QA_HOOKS', '1');
  window.__qaForceRollSuccess = true;
  installDiceQABridge();
  expect(roll2d6(-20, 8)).toMatchObject({ total: 8, success: true });
  window.__qaForceRollFailure = true;
  expect(roll2d6(20, 8)).toMatchObject({ total: 7, success: false });
  expect(roll2d6(20).total).toBeGreaterThan(20);
});
