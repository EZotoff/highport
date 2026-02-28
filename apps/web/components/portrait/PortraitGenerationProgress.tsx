'use client';

import React, { useState, useEffect } from 'react';
import { THEME_HEX, TEXT_COLORS, TYPOGRAPHY } from '@/lib/design-system/themeUtils';

interface PortraitGenerationProgressProps {
  isGenerating: boolean;
}

const STAGES = [
  { message: 'Analyzing character profile...', duration: 3000 },
  { message: 'Generating portrait...', duration: 7000 },
  { message: 'Applying finishing touches...', duration: Infinity },
];

export function PortraitGenerationProgress({ isGenerating }: PortraitGenerationProgressProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setStageIndex(0);
      return;
    }

    let timeout: NodeJS.Timeout;

    const advanceStage = (index: number) => {
      if (index >= STAGES.length - 1) return;

      timeout = setTimeout(() => {
        setStageIndex(index + 1);
        advanceStage(index + 1);
      }, STAGES[index].duration);
    };

    advanceStage(0);

    return () => clearTimeout(timeout);
  }, [isGenerating]);

  if (!isGenerating) return null;

  const cyan = THEME_HEX.cyan;

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-4 min-w-[200px]">
      <div className="relative w-16 h-16">
        {/* Pulsing ring */}
        <div
          className="absolute inset-0 rounded-full border-2 animate-ping opacity-20"
          style={{ borderColor: cyan }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 animate-pulse"
          style={{ borderColor: cyan, boxShadow: `0 0 15px ${cyan}40` }}
        />

        {/* Scanning line effect */}
        <div className="absolute inset-2 overflow-hidden rounded-full border border-white/10 bg-zinc-950/50">
          <div
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_linear_infinite]"
            style={{
              backgroundColor: cyan,
              boxShadow: `0 0 8px ${cyan}`,
            }}
          />

          {/* Internal grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `linear-gradient(${cyan} 1px, transparent 1px), linear-gradient(90deg, ${cyan} 1px, transparent 1px)`,
              backgroundSize: '8px 8px',
            }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center space-y-1">
        <span
          className={`${TYPOGRAPHY.data} text-xs uppercase animate-pulse`}
          style={{ color: cyan }}
        >
          {STAGES[stageIndex].message}
        </span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === stageIndex ? 'animate-bounce' : 'opacity-30'}`}
              style={{ backgroundColor: cyan }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(-5px);
          }
          100% {
            transform: translateY(60px);
          }
        }
      `}</style>
    </div>
  );
}
