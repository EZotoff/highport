'use client';
import React, { forwardRef } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { ThemeColor } from '@/lib/design-system/types';
import { cn } from '@/lib/utils';
import { getThemeStyle, THEME_HEX } from '@/lib/design-system/themeUtils';

interface SciFiButtonProps extends ButtonProps {
  theme?: ThemeColor;
  glow?: boolean;
  scifiVariant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
}

export const SciFiButton = forwardRef<HTMLButtonElement, SciFiButtonProps>(
  (
    {
      className,
      theme = 'cyan',
      scifiVariant = 'primary',
      glow = false,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const themeStyle =
      scifiVariant !== 'destructive'
        ? getThemeStyle(theme, scifiVariant)
        : { style: {}, className: '' };

    const mapToShadcnVariant = (): ButtonProps['variant'] => {
      switch (scifiVariant) {
        case 'primary':
          return 'default';
        case 'secondary':
          return 'outline';
        case 'ghost':
          return 'ghost';
        case 'outline':
          return 'outline';
        case 'destructive':
          return 'destructive';
        default:
          return 'default';
      }
    };

    return (
      <Button
        ref={ref}
        variant={mapToShadcnVariant()}
        className={cn(
          'font-orbitron tracking-wide min-h-[44px] min-w-[44px] relative',
          'focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
          'transition-all duration-200',
          'hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]',
          themeStyle.className,
          glow && 'neon-breathe-active',
          scifiVariant === 'primary' && 'scanline-subtle',
          className,
        )}
        style={{
          ...themeStyle.style,
          ...(glow ? ({ '--neon-color': THEME_HEX[theme] } as React.CSSProperties) : {}),
          ...(scifiVariant === 'outline'
            ? {
                borderImage: `conic-gradient(from var(--border-angle), ${THEME_HEX[theme]}20, ${THEME_HEX[theme]}60, ${THEME_HEX[theme]}20) 1`,
                animation: 'border-rotate 4s linear infinite',
              }
            : {}),
          ...style,
        }}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

SciFiButton.displayName = 'SciFiButton';
