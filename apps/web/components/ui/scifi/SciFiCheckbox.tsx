'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { Check } from 'lucide-react';

interface SciFiCheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'checked' | 'onChange'
> {
  theme?: ThemeColor;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

const themeFocusClasses: Record<ThemeColor, string> = {
  cyan: 'focus-visible:ring-cyan-500/50 focus-visible:border-cyan-400',
  violet: 'focus-visible:ring-violet-500/50 focus-visible:border-violet-400',
  amber: 'focus-visible:ring-amber-500/50 focus-visible:border-amber-400',
  emerald: 'focus-visible:ring-emerald-500/50 focus-visible:border-emerald-400',
  red: 'focus-visible:ring-red-500/50 focus-visible:border-red-400',
  slate: 'focus-visible:ring-slate-500/50 focus-visible:border-slate-400',
};

const themeGlowClasses: Record<ThemeColor, string> = {
  cyan: 'hover:shadow-cyan-500/30',
  violet: 'hover:shadow-violet-500/30',
  amber: 'hover:shadow-amber-500/30',
  emerald: 'hover:shadow-emerald-500/30',
  red: 'hover:shadow-red-500/30',
  slate: 'hover:shadow-slate-500/30',
};

const SciFiCheckbox = React.forwardRef<HTMLInputElement, SciFiCheckboxProps>(
  (
    { className, theme = 'cyan', checked = false, onChange, label, disabled, id, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;
    const themeColor = THEME_HEX[theme];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.checked);
    };

    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          {/* Hidden native input for accessibility */}
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only peer"
            aria-checked={checked}
            {...props}
          />

          {/* Custom checkbox visual */}
          <label
            htmlFor={checkboxId}
            className={cn(
              'relative flex items-center justify-center',
              'w-6 h-6 rounded-md cursor-pointer',
              'border-2 transition-all duration-200',
              // Base styling - glass effect
              'bg-[var(--star-metal)]/80 backdrop-blur-sm',
              // Unchecked state
              'border-[var(--asteroid-dust-50)]',
              // Hover glow effect
              'hover:shadow-lg',
              themeGlowClasses[theme],
              // Focus visible state
              'focus-within:outline-none focus-visible:ring-2',
              themeFocusClasses[theme],
              // Checked state
              'peer-checked:border-[color:var(--theme-color)]',
              'peer-checked:bg-[color:var(--theme-color)]/20',
              'peer-checked:shadow-[0_0_12px_var(--theme-glow)]',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
              className,
            )}
            style={
              {
                '--theme-color': themeColor,
                '--theme-glow': `${themeColor}40`,
              } as React.CSSProperties
            }
          >
            {/* Checkmark icon */}
            <Check
              className={cn(
                'w-4 h-4 transition-all duration-200',
                checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
                'text-[color:var(--theme-color)]',
              )}
              strokeWidth={3}
            />
          </label>
        </div>

        {label && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-sm font-medium text-[var(--text-label)] cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);

SciFiCheckbox.displayName = 'SciFiCheckbox';

export { SciFiCheckbox };
