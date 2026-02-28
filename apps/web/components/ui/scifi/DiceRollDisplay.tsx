import React, { memo } from 'react';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface DiceRollDisplayProps {
  dice: string;
  rolls: number[];
  total: number;
  modifier?: number;
  target?: number;
  success?: boolean;
  attribute?: string;
  label?: string;
  compact?: boolean;
}

export const DiceRollDisplay = memo(function DiceRollDisplay({
  dice,
  rolls,
  total,
  modifier = 0,
  target,
  success,
  attribute,
  label,
  compact = false,
}: DiceRollDisplayProps) {
  const finalTotal = total;
  const showResult = success !== undefined;

  const resultColor = success ? THEME_HEX.emerald : THEME_HEX.red;
  const resultBg = success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
  const resultBorder = success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm"
        style={{
          background: 'var(--star-metal-80)',
          border: `1px solid ${showResult ? resultBorder : 'var(--asteroid-dust-50)'}`,
        }}
      >
        {label && (
          <span className="text-gray-400 text-xs uppercase tracking-wider mr-1">{label}</span>
        )}
        <span className="text-gray-500">{dice}</span>
        <span className="text-gray-400">→</span>
        <span style={{ color: showResult ? resultColor : THEME_HEX.cyan }} className="font-bold">
          {finalTotal}
        </span>
        {target && <span className="text-gray-500 text-xs">vs {target}+</span>}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: showResult ? resultBg : 'var(--star-metal-60)',
        border: `1px solid ${showResult ? resultBorder : 'var(--asteroid-dust-50)'}`,
      }}
    >
      <div className="flex gap-1.5">
        {rolls.map((die, i) => (
          <div
            key={i}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold font-mono relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, var(--nebula-mist-90) 0%, var(--star-metal-90) 100%)',
              border: `1px solid ${die === 6 ? THEME_HEX.emerald : die === 1 ? THEME_HEX.red : 'var(--asteroid-dust-50)'}`,
              color: die === 6 ? THEME_HEX.emerald : die === 1 ? THEME_HEX.red : '#e2e8f0',
              boxShadow:
                die === 6
                  ? `0 0 10px ${THEME_HEX.emerald}30`
                  : die === 1
                    ? `0 0 10px ${THEME_HEX.red}30`
                    : 'none',
            }}
          >
            {die}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 font-mono text-sm">
        <span className="text-gray-500">=</span>
        <span className="text-gray-300">{rolls.reduce((a, b) => a + b, 0)}</span>

        {modifier !== 0 && (
          <>
            <span style={{ color: modifier > 0 ? THEME_HEX.cyan : THEME_HEX.red }}>
              {modifier > 0 ? '+' : ''}
              {modifier}
            </span>
            {attribute && <span className="text-gray-500 text-xs">({attribute})</span>}
            <span className="text-gray-500">=</span>
          </>
        )}

        <span
          className="text-xl font-bold"
          style={{ color: showResult ? resultColor : THEME_HEX.cyan }}
        >
          {finalTotal}
        </span>

        {target !== undefined && (
          <>
            <span className="text-gray-600 mx-1">vs</span>
            <span style={{ color: THEME_HEX.amber }} className="font-bold">
              {target}+
            </span>
          </>
        )}
      </div>

      {showResult && (
        <div
          className="ml-auto px-3 py-1 rounded text-xs font-bold uppercase tracking-wider"
          style={{
            backgroundColor: resultBg,
            color: resultColor,
            border: `1px solid ${resultBorder}`,
          }}
        >
          {success ? 'SUCCESS' : 'FAILED'}
        </div>
      )}
    </div>
  );
});
