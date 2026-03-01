'use client';
import React from 'react';
import { useReducedMotion } from '@/lib/design-system/animationUtils';

interface ProcessFlowSheenProps {
  duration?: number;
  delay?: number;
  mode?: 'light' | 'dark';
}

export const ProcessFlowSheen: React.FC<ProcessFlowSheenProps> = ({
  duration = 3,
  delay = 0,
  mode = 'light',
}) => {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <div className="absolute inset-0 overflow-hidden z-20 pointer-events-none select-none rounded-inherit mix-blend-overlay">
      <style>{`
                @keyframes angled-sheen-scan {
                    0% { transform: translateX(-100%) skewX(-20deg); }
                    100% { transform: translateX(200%) skewX(-20deg); }
                }
            `}</style>

      <div
        className="absolute inset-y-0 left-0 w-full flex items-center"
        style={{
          animation: `angled-sheen-scan ${duration}s ease-in-out infinite`,
          animationDelay: `${delay}s`,
          willChange: 'transform',
        }}
      >
        <div className="absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="absolute inset-y-0 left-[35%] w-1/6 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-[1px]"></div>

        <div className="absolute inset-y-0 left-[10%] w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent blur-md"></div>
      </div>
    </div>
  );
};
