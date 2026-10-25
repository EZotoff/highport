import { setDiceOverrideInterceptor } from '@highport/mgt2e';

declare global {
  interface Window {
    __qaForceRollSuccess?: boolean;
    __qaForceRollFailure?: boolean;
  }
}

export function installDiceQABridge(): void {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_QA_HOOKS !== '1') return;

  setDiceOverrideInterceptor(({ total, target }) => {
    if (target === undefined) return { total };
    if (window.__qaForceRollFailure === true) return { total: target - 1, success: false };
    if (window.__qaForceRollSuccess === true)
      return { total: Math.max(total, target), success: true };
    return { total, success: total >= target };
  });
}
