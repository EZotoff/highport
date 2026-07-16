import React from 'react';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface Step {
  id: string;
  label: string;
}

interface StepNavigationProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

const SHORT_LABELS: Record<string, string> = {
  background: 'BG',
  careers: 'CR',
  skills: 'SK',
  benefits: 'BN',
  finalize: 'FN',
};

export default function StepNavigation({ steps, currentStep, onStepClick }: StepNavigationProps) {
  const totalSteps = steps.length;
  const currentLabel = steps[currentStep]?.label ?? '';

  return (
    <div
      className="rounded-lg p-3 backdrop-blur-md w-[320px]"
      data-testid="step-navigation"
      style={{
        backgroundColor: 'rgba(10, 13, 20, 0.7)',
        border: `1px solid rgba(0, 240, 255, 0.15)`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] uppercase font-mono tracking-[0.22em]"
          style={{ color: THEME_HEX.cyan }}
        >
          Progress
        </span>
        <span className="text-[10px] font-mono text-subtle">
          <span className="text-heading font-bold">{currentStep + 1}</span>
          <span className="mx-0.5 opacity-50">/</span>
          {totalSteps}
        </span>
      </div>

      <div className="relative flex items-center justify-between pb-1">
        <div
          className="absolute left-3 right-3 top-[14px] transform -translate-y-1/2 h-0.5"
          style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}
        />
        <div
          className="absolute left-3 top-[14px] transform -translate-y-1/2 h-0.5 transition-all duration-500"
          style={{
            width: `calc((100% - 24px) * ${currentStep / (totalSteps - 1)})`,
            background: `linear-gradient(90deg, ${THEME_HEX.cyan}, ${THEME_HEX.violet})`,
            boxShadow: `0 0 8px ${THEME_HEX.cyan}40`,
          }}
        />

        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <button
                onClick={() => onStepClick?.(index)}
                disabled={isUpcoming}
                aria-label={`Step ${index + 1}: ${step.label}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`w-7 h-7 min-w-[28px] min-h-[28px] rounded-full flex items-center justify-center border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                  !isUpcoming ? 'hover:scale-110 cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: isCompleted ? THEME_HEX.cyan : 'rgba(10, 13, 20, 0.95)',
                  borderColor: isCompleted
                    ? THEME_HEX.cyan
                    : isCurrent
                      ? THEME_HEX.violet
                      : 'rgba(148, 163, 184, 0.4)',
                  color: isCompleted ? '#0a0d14' : isCurrent ? THEME_HEX.violet : '#e2e8f0',
                  boxShadow: isCompleted
                    ? `0 0 8px ${THEME_HEX.cyan}60`
                    : isCurrent
                      ? `0 0 12px ${THEME_HEX.violet}50`
                      : 'none',
                }}
              >
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="font-bold text-[11px]">{index + 1}</span>
                )}
              </button>
              <span
                className="mt-1 text-[9px] font-mono uppercase tracking-wider transition-colors"
                style={{
                  color: isCurrent
                    ? THEME_HEX.violet
                    : isCompleted
                      ? THEME_HEX.cyan
                      : 'rgba(148, 163, 184, 0.6)',
                }}
              >
                {SHORT_LABELS[step.id] ?? step.label.slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-2 pt-2 border-t text-[10px] font-mono uppercase tracking-wider text-center"
        style={{ borderColor: 'rgba(148, 163, 184, 0.15)' }}
      >
        <span className="text-subtle">Now: </span>
        <span style={{ color: THEME_HEX.violet }}>{currentLabel}</span>
      </div>
    </div>
  );
}
