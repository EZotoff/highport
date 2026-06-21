'use client';

import React from 'react';
import { GlassPanel } from '@/components/ui/scifi';

interface BentoGridProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  minWidth?: string;
  className?: string;
}

export const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ children, gap, minWidth = '280px', className = '' }, ref) => {
    const bentoMinVar = '--bento-min';
    const gapVar = 'var(--chargen-gap)';

    const gridStyle: React.CSSProperties & Record<string, string> = {
      display: 'grid' as const,
      gridTemplateColumns: `repeat(auto-fit, minmax(var(${bentoMinVar}), 1fr))`,
      gap: gapVar,
      [bentoMinVar]: minWidth,
    };

    if (gap !== undefined) {
      gridStyle.gap = `${gap}px`;
    }

    const wrappedChildren = React.Children.map(children, (child: React.ReactNode) => (
      <GlassPanel variant="subtle">{child}</GlassPanel>
    ));

    return (
      <div ref={ref} style={gridStyle} className={className}>
        {wrappedChildren}
      </div>
    );
  },
);

BentoGrid.displayName = 'BentoGrid';

export default BentoGrid;
