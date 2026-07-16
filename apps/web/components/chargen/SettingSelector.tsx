import React from 'react';
import { SciFiButton } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface SettingSelectorOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface SettingSelectorProps<T extends string> {
  value: T;
  options: ReadonlyArray<SettingSelectorOption<T>>;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
}

export default function SettingSelector<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
}: SettingSelectorProps<T>) {
  const groupId = React.useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div
      className="rounded-lg p-2.5 backdrop-blur-md w-[320px]"
      data-testid="setting-selector"
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
          {label}
        </span>
        <span className="text-[9px] text-subtle italic">{selected?.description ?? ''}</span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex gap-1 p-1 rounded-md bg-[var(--star-metal)] border border-[var(--asteroid-dust-50)]"
      >
        {options.map((option) => (
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
