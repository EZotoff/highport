'use client';
import React, { forwardRef } from 'react';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX, TYPOGRAPHY } from '@/lib/design-system/themeUtils';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

interface SciFiCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  theme?: ThemeColor;
  variant?: 'default' | 'elevated' | 'bordered';
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  glow?: boolean;
}

export const SciFiCard = forwardRef<HTMLDivElement, SciFiCardProps>(
  (
    {
      title,
      subtitle,
      theme = 'cyan',
      variant = 'default',
      headerAction,
      footer,
      children,
      className,
      contentClassName,
      glow = false,
      ...props
    },
    ref,
  ) => {
    const themeHex = THEME_HEX[theme];

    const headerPadding = 'px-6 py-4';
    const contentPadding = 'p-6';
    const footerPadding = 'px-4 py-3';

    return (
      <GlassPanel
        ref={ref}
        theme={theme}
        variant={variant}
        glow={glow}
        className={cn('flex flex-col', className)}
        {...props}
      >
        {(title || subtitle || headerAction) && (
          <div className={cn('flex items-start justify-between', headerPadding)}>
            <div className="flex flex-col gap-1">
              {title && (
                <h3
                  className={cn(
                    "font-['Orbitron'] text-xl font-bold tracking-wide",
                    glow
                      ? `text-[${themeHex}] drop-shadow-[0_0_8px_${themeHex}60]`
                      : 'text-foreground',
                  )}
                  style={glow ? { color: themeHex, textShadow: `0 0 10px ${themeHex}60` } : {}}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground/80 font-light">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="ml-4 shrink-0">{headerAction}</div>}
          </div>
        )}

        <div className={cn('flex-1', contentPadding, contentClassName)}>{children}</div>

        {footer && (
          <div className={cn('border-t border-[var(--asteroid-dust-50)]', footerPadding)}>
            {footer}
          </div>
        )}
      </GlassPanel>
    );
  },
);

SciFiCard.displayName = 'SciFiCard';
