import React from 'react';
import { ThemeColor } from '@/lib/design-system/types';
import {
  getThemeBgClass,
  getThemeTextClass,
  getThemeBorderClass,
  THEME_HEX,
  isValidTheme,
} from '@/lib/design-system/themeUtils';
import { cn } from '@/lib/utils';

export interface SciFiBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  theme?: ThemeColor;
  variant?: 'default' | 'outline' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SciFiBadge({
  children,
  theme = 'cyan',
  variant = 'default',
  size = 'md',
  className,
  style,
  ...props
}: SciFiBadgeProps) {
  const safeTheme = isValidTheme(theme) ? theme : 'cyan';

  const baseClasses =
    'inline-flex items-center rounded-none font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 holo-shimmer relative';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  let variantClasses = '';

  if (variant === 'default') {
    variantClasses = cn(getThemeBgClass(safeTheme, '500/20'), getThemeTextClass(safeTheme, 300));
  } else if (variant === 'outline') {
    variantClasses = cn(
      'bg-transparent border',
      getThemeBorderClass(safeTheme, '500/50'),
      getThemeTextClass(safeTheme, 400),
    );
  } else if (variant === 'glow') {
    variantClasses = cn(getThemeBgClass(safeTheme, '500/20'), getThemeTextClass(safeTheme, 300));
  }

  const customStyle: React.CSSProperties = {
    ...style,
    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
    borderLeft: `3px solid ${THEME_HEX[safeTheme]}`,
  };
  if (variant === 'glow') {
    const hex = THEME_HEX[safeTheme];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    customStyle.boxShadow = `0 0 10px rgba(${r},${g},${b},0.3)`;
  }

  return (
    <div
      className={cn(baseClasses, sizeClasses[size], variantClasses, className)}
      style={customStyle}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SkillBadgeProps {
  skill: string;
  level: number;
  theme?: ThemeColor;
  className?: string;
}

export function SkillBadge({ skill, level, theme = 'emerald', className }: SkillBadgeProps) {
  const safeTheme = isValidTheme(theme) ? theme : 'emerald';
  const hex = THEME_HEX[safeTheme];
  const fillPercentage = Math.min((level / 5) * 100, 100);

  return (
    <SciFiBadge
      theme={theme}
      size="sm"
      className={cn('overflow-hidden', className)}
      style={{ position: 'relative' }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: `${fillPercentage}%`,
          background: `linear-gradient(90deg, ${hex}20, ${hex}40, ${hex}20)`,
          backgroundSize: '200% 100%',
          animation: 'energy-flow 2s linear infinite',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <span className="relative z-[1]">
        {skill} {level}
      </span>
    </SciFiBadge>
  );
}
