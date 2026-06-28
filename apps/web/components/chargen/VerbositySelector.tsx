import React from 'react';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { SciFiButton } from '@/components/ui/scifi';

interface VerbositySelectorProps {
  value: VerbosityLevel;
  onChange: (level: VerbosityLevel) => void;
  disabled?: boolean;
}

const VERBOSITY_OPTIONS: Array<{
  value: VerbosityLevel;
  label: string;
  description: string;
}> = [
  {
    value: 'brief',
    label: 'Brief',
    description: '1-2 sentence gloss',
  },
  {
    value: 'inspiration',
    label: 'Inspiration',
    description: 'Several concrete hooks to pick from',
  },
  {
    value: 'full',
    label: 'Full',
    description: 'A drafted scene with named NPCs',
  },
];

export default function VerbositySelector({
  value,
  onChange,
  disabled = false,
}: VerbositySelectorProps) {
  const groupId = 'verbosity-selector-label';

  return (
    <div className="space-y-3">
      <p id={groupId} className="block text-sm font-medium text-subtle">
        AI Assistance Level
      </p>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex flex-wrap sm:flex-nowrap gap-2 p-1.5 rounded-lg bg-[var(--star-metal)] border border-[var(--asteroid-dust-50)]"
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
            aria-label={`${option.label}: ${option.description}`}
            className={`flex-1 min-w-[90px] min-h-[56px] ${
              value === option.value ? '[&_*]:!text-[#e2e8f0]' : ''
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-[10px] text-label">{option.description}</span>
            </span>
          </SciFiButton>
        ))}
      </div>
    </div>
  );
}
