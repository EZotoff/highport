'use client';

import React from 'react';
import type { VerbosityLevel } from '../../lib/chargen/narrative';

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
    value: 'minimal',
    label: 'Minimal',
    description: 'Names only',
  },
  {
    value: 'structured',
    label: 'Structured',
    description: 'Names + 1-liners',
  },
  {
    value: 'rich',
    label: 'Rich',
    description: 'Full prose',
  },
];

export default function VerbositySelector({
  value,
  onChange,
  disabled = false,
}: VerbositySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-zinc-400">
        AI Assistance Level
      </label>
      <div className="flex gap-2">
        {VERBOSITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`
              flex-1 px-3 py-2 rounded-lg border transition-all
              ${value === option.value
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-600'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="font-medium text-sm">{option.label}</div>
            <div className={`text-xs ${value === option.value ? 'text-blue-200' : 'text-zinc-500'}`}>
              {option.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
