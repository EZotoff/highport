import * as React from 'react';
import { cn } from '@/lib/utils';
import { ThemeColor } from '@/lib/design-system/types';

interface SciFiInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme?: ThemeColor;
  error?: boolean;
  label?: string;
}

const themeFocusClasses: Record<ThemeColor, string> = {
  cyan: 'focus:ring-cyan-500/50 focus:border-cyan-500/50',
  violet: 'focus:ring-violet-500/50 focus:border-violet-500/50',
  amber: 'focus:ring-amber-500/50 focus:border-amber-500/50',
  emerald: 'focus:ring-emerald-500/50 focus:border-emerald-500/50',
  red: 'focus:ring-red-500/50 focus:border-red-500/50',
  slate: 'focus:ring-slate-500/50 focus:border-slate-500/50',
};

const SciFiInput = React.forwardRef<HTMLInputElement, SciFiInputProps>(
  ({ className, type, theme = 'cyan', error, label, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold uppercase tracking-wider text-[var(--text-label)] ml-1"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            'w-full px-4 py-3 rounded-lg',
            'bg-[var(--star-metal)]',
            'border border-[var(--asteroid-dust-50)]',
            'text-gray-100 placeholder:text-gray-500',
            'focus:outline-none focus:ring-2',
            themeFocusClasses[theme] || themeFocusClasses.cyan,
            'transition-all duration-200',
            error && 'border-red-500/50 ring-2 ring-red-500/30',
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
SciFiInput.displayName = 'SciFiInput';

export { SciFiInput };
