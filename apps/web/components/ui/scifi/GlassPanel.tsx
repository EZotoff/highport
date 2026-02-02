import React, { forwardRef } from 'react';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: ThemeColor;
  variant?: 'default' | 'elevated' | 'bordered' | 'subtle';
  glow?: boolean;
  hoverGlow?: boolean;
  children: React.ReactNode;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ theme = 'cyan', variant = 'default', glow = false, hoverGlow = false, className = '', children, style, ...props }, ref) => {
    const themeHex = THEME_HEX[theme];
    
    const baseStyles: React.CSSProperties = {
      background: 'var(--nebula-mist-80)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '0.75rem',
      transition: 'all 0.3s ease',
      ...style,
    };
    
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        border: '1px solid var(--asteroid-dust-50)',
      },
      elevated: {
        border: '1px solid var(--asteroid-dust-50)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
      },
      bordered: {
        border: `1px solid ${themeHex}30`,
      },
      subtle: {
        background: 'var(--star-metal-50)',
        border: '1px solid var(--asteroid-dust-30)',
      },
    };
    
    const glowStyle = glow ? {
      boxShadow: `0 0 15px ${themeHex}66, 0 0 30px ${themeHex}33, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
    } : {};
    
    const combinedStyle = {
      ...baseStyles,
      ...variantStyles[variant],
      ...glowStyle,
    };
    
    // Handle hover glow with CSS custom properties
    const hoverClass = hoverGlow 
      ? `hover:shadow-[0_0_20px_${themeHex}80,0_0_40px_${themeHex}40]` 
      : '';
    
    return (
      <div
        ref={ref}
        className={`relative overflow-hidden ${className} ${hoverClass}`}
        style={combinedStyle}
        {...props}
      >
        {/* Corner accents for bordered variant */}
        {variant === 'bordered' && (
          <>
            <div 
              className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 pointer-events-none"
              style={{ borderColor: `${themeHex}50` }}
            />
            <div 
              className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 pointer-events-none"
              style={{ borderColor: `${themeHex}50` }}
            />
            <div 
              className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 pointer-events-none"
              style={{ borderColor: `${themeHex}30` }}
            />
            <div 
              className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 pointer-events-none"
              style={{ borderColor: `${themeHex}30` }}
            />
          </>
        )}
        
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';
