import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface SciFiSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  theme?: ThemeColor;
  className?: string;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
}

export const SciFiSelect: React.FC<SciFiSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  options,
  theme = 'cyan',
  className = '',
  disabled = false,
  id,
  ariaLabel,
}) => {
  const themeHex = THEME_HEX[theme];

  const itemThemeClasses = {
    cyan: 'focus:bg-cyan-500/10 focus:text-cyan-100 data-[state=checked]:text-cyan-400',
    violet: 'focus:bg-violet-500/10 focus:text-violet-100 data-[state=checked]:text-violet-400',
    amber: 'focus:bg-amber-500/10 focus:text-amber-100 data-[state=checked]:text-amber-400',
    emerald: 'focus:bg-emerald-500/10 focus:text-emerald-100 data-[state=checked]:text-emerald-400',
    red: 'focus:bg-red-500/10 focus:text-red-100 data-[state=checked]:text-red-400',
    slate: 'focus:bg-slate-500/10 focus:text-slate-100 data-[state=checked]:text-slate-400',
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={`
          relative w-full
          bg-[var(--star-metal)]
          border-[var(--asteroid-dust-50)]
          text-gray-100
          transition-all duration-300
          hover:border-[var(--asteroid-dust)]
          focus:ring-2 focus:ring-cyan-500/50 focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
        id={id}
        aria-label={ariaLabel}
        style={{
          // @ts-ignore - CSS custom property for dynamic ring color
          '--tw-ring-color': themeHex,
        }}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent
        className={`
          backdrop-blur-xl
          bg-[var(--nebula-mist)]/90
          border-[var(--asteroid-dust-50)]
          text-gray-100
          z-50
        `}
        style={{
          borderColor: `${themeHex}40`,
        }}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={`
              cursor-pointer
              transition-colors
              ${itemThemeClasses[theme]}
            `}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
