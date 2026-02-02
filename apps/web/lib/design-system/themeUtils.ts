import { ThemeColor } from './types';

export const THEME_COLORS = ['cyan', 'violet', 'amber', 'emerald', 'red', 'slate'] as const;

export const isValidTheme = (theme: string): theme is ThemeColor => {
  return THEME_COLORS.includes(theme as ThemeColor);
};

interface ThemeStyleSet {
  bg: string;
  border: string;
  borderL: string;
  borderB: string;
  iconBg: string;
  iconText: string;
  actionText: string;
  solid: string;
}

const getSolidStyle = (color: string) => 
  `bg-gradient-to-br from-${color}-400 to-${color}-600 text-white shadow-lg shadow-${color}-500/40 ring-1 ring-inset ring-white/20`;

export const THEME_STYLES: Record<ThemeColor, ThemeStyleSet> = {
  cyan: { 
      bg: 'bg-cyan-900/10', border: 'border-cyan-500', borderL: 'border-l-cyan-500', borderB: 'border-b-cyan-500/30', 
      iconBg: 'bg-cyan-500/20', iconText: 'text-cyan-300', actionText: 'text-cyan-400',
      solid: getSolidStyle('cyan')
  },
  violet: { 
      bg: 'bg-violet-900/10', border: 'border-violet-500', borderL: 'border-l-violet-500', borderB: 'border-b-violet-500/30', 
      iconBg: 'bg-violet-500/20', iconText: 'text-violet-300', actionText: 'text-violet-400',
      solid: getSolidStyle('violet')
  },
  amber: { 
      bg: 'bg-amber-900/10', border: 'border-amber-500', borderL: 'border-l-amber-500', borderB: 'border-b-amber-500/30', 
      iconBg: 'bg-amber-500/20', iconText: 'text-amber-300', actionText: 'text-amber-400',
      solid: getSolidStyle('amber')
  },
  emerald: { 
      bg: 'bg-emerald-900/10', border: 'border-emerald-500', borderL: 'border-l-emerald-500', borderB: 'border-b-emerald-500/30', 
      iconBg: 'bg-emerald-500/20', iconText: 'text-emerald-300', actionText: 'text-emerald-400',
      solid: getSolidStyle('emerald')
  },
  red: { 
      bg: 'bg-red-900/10', border: 'border-red-500', borderL: 'border-l-red-500', borderB: 'border-b-red-500/30', 
      iconBg: 'bg-red-500/20', iconText: 'text-red-300', actionText: 'text-red-400',
      solid: getSolidStyle('red')
  },
  slate: { 
      bg: 'bg-slate-900/10', border: 'border-slate-500', borderL: 'border-l-slate-500', borderB: 'border-b-slate-500/30', 
      iconBg: 'bg-slate-500/20', iconText: 'text-slate-300', actionText: 'text-slate-400',
      solid: getSolidStyle('slate')
  },
};

export const THEME_HEX: Record<ThemeColor, string> = {
  cyan: '#00f0ff',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  emerald: '#10b981',
  red: '#ef4444',
  slate: '#94a3b8',
};

export const getThemeDotStyle = (colorHex: string) => ({
  backgroundColor: colorHex,
  boxShadow: `0 0 12px 2px ${colorHex}80`
});

export const getEffectiveTheme = (activeTheme: string | undefined, baseTheme: string, phase: string): string => {
    const isTransitioningOut = phase === 'exiting' || phase === 'waiting';
    if (isTransitioningOut) return 'slate';
    return activeTheme || baseTheme;
};

export const TYPOGRAPHY = {
  body: "font-['Inter'] text-lg md:text-xl font-light leading-relaxed tracking-wide",
  secondary: "font-['Inter'] text-base md:text-lg font-light leading-relaxed",
  label: "font-['Inter'] text-[10px] md:text-xs font-bold uppercase tracking-[0.15em]",
  micro: "font-['Inter'] text-[9px] font-bold uppercase tracking-widest",
  heading: "font-['Orbitron'] text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight drop-shadow-2xl",
  subheading: "font-['Orbitron'] text-xl md:text-2xl lg:text-3xl font-light tracking-wide",
  data: "font-['JetBrains_Mono'] text-sm tracking-wider",
};

const THEME_CONFIG = {
  cyan: {
    text: { 100: 'text-cyan-100', 200: 'text-cyan-200', 300: 'text-cyan-300', 400: 'text-cyan-400', 500: 'text-cyan-500' },
    bg: { '500/5': 'bg-cyan-500/5', '500/10': 'bg-cyan-500/10', '500/20': 'bg-cyan-500/20' },
    border: { 400: 'border-cyan-400', '500/20': 'border-cyan-500/20', '500/30': 'border-cyan-500/30', '500/50': 'border-cyan-500/50' },
    ring: { '500/30': 'ring-cyan-500/30' },
    shadow: { '500/20': 'shadow-cyan-500/20', '500/40': 'shadow-cyan-500/40' },
    from: { '500/50': 'from-cyan-500/50' },
    hoverBorder: { 400: 'hover:border-cyan-400', '500/30': 'hover:border-cyan-500/30', '400/50': 'hover:border-cyan-400/50' }
  },
  violet: {
    text: { 100: 'text-violet-100', 200: 'text-violet-200', 300: 'text-violet-300', 400: 'text-violet-400', 500: 'text-violet-500' },
    bg: { '500/5': 'bg-violet-500/5', '500/10': 'bg-violet-500/10', '500/20': 'bg-violet-500/20' },
    border: { 400: 'border-violet-400', '500/20': 'border-violet-500/20', '500/30': 'border-violet-500/30', '500/50': 'border-violet-500/50' },
    ring: { '500/30': 'ring-violet-500/30' },
    shadow: { '500/20': 'shadow-violet-500/20', '500/40': 'shadow-violet-500/40' },
    from: { '500/50': 'from-violet-500/50' },
    hoverBorder: { 400: 'hover:border-violet-400', '500/30': 'hover:border-violet-500/30', '400/50': 'hover:border-violet-400/50' }
  },
  amber: {
    text: { 100: 'text-amber-100', 200: 'text-amber-200', 300: 'text-amber-300', 400: 'text-amber-400', 500: 'text-amber-500' },
    bg: { '500/5': 'bg-amber-500/5', '500/10': 'bg-amber-500/10', '500/20': 'bg-amber-500/20' },
    border: { 400: 'border-amber-400', '500/20': 'border-amber-500/20', '500/30': 'border-amber-500/30', '500/50': 'border-amber-500/50' },
    ring: { '500/30': 'ring-amber-500/30' },
    shadow: { '500/20': 'shadow-amber-500/20', '500/40': 'shadow-amber-500/40' },
    from: { '500/50': 'from-amber-500/50' },
    hoverBorder: { 400: 'hover:border-amber-400', '500/30': 'hover:border-amber-500/30', '400/50': 'hover:border-amber-400/50' }
  },
  emerald: {
    text: { 100: 'text-emerald-100', 200: 'text-emerald-200', 300: 'text-emerald-300', 400: 'text-emerald-400', 500: 'text-emerald-500' },
    bg: { '500/5': 'bg-emerald-500/5', '500/10': 'bg-emerald-500/10', '500/20': 'bg-emerald-500/20' },
    border: { 400: 'border-emerald-400', '500/20': 'border-emerald-500/20', '500/30': 'border-emerald-500/30', '500/50': 'border-emerald-500/50' },
    ring: { '500/30': 'ring-emerald-500/30' },
    shadow: { '500/20': 'shadow-emerald-500/20', '500/40': 'shadow-emerald-500/40' },
    from: { '500/50': 'from-emerald-500/50' },
    hoverBorder: { 400: 'hover:border-emerald-400', '500/30': 'hover:border-emerald-500/30', '400/50': 'hover:border-emerald-400/50' }
  },
  red: {
    text: { 100: 'text-red-100', 200: 'text-red-200', 300: 'text-red-300', 400: 'text-red-400', 500: 'text-red-500' },
    bg: { '500/5': 'bg-red-500/5', '500/10': 'bg-red-500/10', '500/20': 'bg-red-500/20' },
    border: { 400: 'border-red-400', '500/20': 'border-red-500/20', '500/30': 'border-red-500/30', '500/50': 'border-red-500/50' },
    ring: { '500/30': 'ring-red-500/30' },
    shadow: { '500/20': 'shadow-red-500/20', '500/40': 'shadow-red-500/40' },
    from: { '500/50': 'from-red-500/50' },
    hoverBorder: { 400: 'hover:border-red-400', '500/30': 'hover:border-red-500/30', '400/50': 'hover:border-red-400/50' }
  },
  slate: {
    text: { 100: 'text-slate-100', 200: 'text-slate-200', 300: 'text-slate-300', 400: 'text-slate-400', 500: 'text-slate-500' },
    bg: { '500/5': 'bg-slate-500/5', '500/10': 'bg-slate-500/10', '500/20': 'bg-slate-500/20' },
    border: { 400: 'border-slate-400', '500/20': 'border-slate-500/20', '500/30': 'border-slate-500/30', '500/50': 'border-slate-500/50' },
    ring: { '500/30': 'ring-slate-500/30' },
    shadow: { '500/20': 'shadow-slate-500/20', '500/40': 'shadow-slate-500/40' },
    from: { '500/50': 'from-slate-500/50' },
    hoverBorder: { 400: 'hover:border-slate-400', '500/30': 'hover:border-slate-500/30', '400/50': 'hover:border-slate-400/50' }
  }
};

const getThemeKey = (theme: string): ThemeColor => isValidTheme(theme) ? theme : 'cyan';

export const getThemeTextClass = (theme: string, shade: 100 | 200 | 300 | 400 | 500 = 400): string => 
  THEME_CONFIG[getThemeKey(theme)].text[shade];

export const getThemeBgClass = (theme: string, opacity: '500/5' | '500/10' | '500/20' = '500/10'): string => 
  THEME_CONFIG[getThemeKey(theme)].bg[opacity];

export const getThemeBorderClass = (theme: string, variant: 400 | '500/20' | '500/30' | '500/50' = 400): string => 
  THEME_CONFIG[getThemeKey(theme)].border[variant];

export const getThemeRingClass = (theme: string, variant: '500/30' = '500/30'): string => 
  THEME_CONFIG[getThemeKey(theme)].ring[variant];

export const getThemeShadowClass = (theme: string, variant: '500/20' | '500/40' = '500/20'): string => 
  THEME_CONFIG[getThemeKey(theme)].shadow[variant];

export const getThemeGradientFromClass = (theme: string, variant: '500/50' = '500/50'): string => 
  THEME_CONFIG[getThemeKey(theme)].from[variant];

export const getThemeHoverBorderClass = (theme: string, variant: 400 | '500/30' | '400/50' = 400): string => 
  THEME_CONFIG[getThemeKey(theme)].hoverBorder[variant];
