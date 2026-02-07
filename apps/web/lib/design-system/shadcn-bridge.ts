/**
 * Bridge utilities between our sci-fi design system and shadcn/ui
 * This file provides type-safe helpers for consistent theming
 */

import { ThemeColor } from './types';
import { cn } from '@/lib/utils';

// Map our ThemeColor to shadcn-compatible class variants
export const SCIFI_VARIANT_MAP = {
  cyan: 'primary',
  violet: 'secondary', 
  amber: 'warning',
  emerald: 'success',
  red: 'destructive',
  slate: 'muted',
} as const;

// CSS variable overrides for themed components
export const getThemeVars = (theme: ThemeColor): Record<string, string> => {
  const themeMap: Record<ThemeColor, Record<string, string>> = {
    cyan: {
      '--ring': 'var(--plasma-cyan)',
      '--primary': 'var(--plasma-cyan)',
    },
    violet: {
      '--ring': 'var(--impulse-violet)',
      '--primary': 'var(--impulse-violet)',
    },
    amber: {
      '--ring': 'var(--reactor-amber)',
      '--primary': 'var(--reactor-amber)',
    },
    emerald: {
      '--ring': 'var(--warp-emerald)',
      '--primary': 'var(--warp-emerald)',
    },
    red: {
      '--ring': 'var(--hull-breach-red)',
      '--primary': 'var(--hull-breach-red)',
    },
    slate: {
      '--ring': 'var(--asteroid-dust)',
      '--primary': 'var(--asteroid-dust)',
    },
  };
  return themeMap[theme];
};

// Re-export cn for convenience
export { cn };
