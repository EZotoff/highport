import React from 'react';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { SciFiButton } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface VerbositySelectorProps {
  value: VerbosityLevel;
  onChange: (level: VerbosityLevel) => void;
  disabled?: boolean;
}

const VERBOSITY_OPTIONS: Array<{ value: VerbosityLevel; label: string; hint: string }> = [
  { value: 'brief', label: 'Brief', hint: '1-2 sentences' },
  { value: 'inspiration', label: 'Inspiration', hint: 'Choose from hooks' },
  { value: 'full', label: 'Full', hint: 'Scene + NPCs' },
];

export default function VerbositySelector({
  value,
  onChange,
  disabled = false,
}: VerbositySelectorProps) {
  const groupId = 'verbosity-selector-label';

  return (
    <div
      className="rounded-lg p-2.5 backdrop-blur-md w-[320px]"
      data-testid="verbosity-selector"
      style={{
        backgroundColor: 'rgba(10, 13, 20, 0.7)',
        border: `1px solid rgba(0, 240, 255, 0.15)`,
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          id={groupId}
          className="text-[10px] uppercase font-mono tracking-[0.22em]"
          style={{ color: THEME_HEX.cyan }}
        >
          AI Assistance
        </span>
        <span className="text-[9px] text-subtle italic">
          {VERBOSITY_OPTIONS.find((o) => o.value === value)?.hint ?? ''}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex gap-1 p-1 rounded-md bg-[var(--star-metal)] border border-[var(--asteroid-dust-50)]"
      >
        {VERBOSITY_OPTIONS.map((option) => (
          <SciFiButton
            key={option.value}
            theme="violet"
            scifiVariant={value === option.value ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            role="radio"
            aria-checked={value === option.value}
            aria-label={`${option.label}: ${option.hint}`}
            className={`flex-1 min-w-[70px] min-h-[32px] ${
              value === option.value ? '[&_*]:!text-[#e2e8f0]' : ''
            }`}
          >
            <span className="text-xs font-medium">{option.label}</span>
          </SciFiButton>
        ))}
      </div>
    </div>
  );
}
