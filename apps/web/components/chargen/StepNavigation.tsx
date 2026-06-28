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

export default function StepNavigation({ steps, currentStep, onStepClick }: StepNavigationProps) {
  return (
    <div className="flex justify-center items-center w-full pt-2 pb-4 mb-4">
      <div className="flex items-start justify-between relative w-full max-w-5xl px-4">
        <div
          className="absolute left-0 top-5 sm:top-[22px] transform -translate-y-1/2 w-full h-0.5 -z-0"
          style={{ backgroundColor: 'rgba(148, 163, 184, 0.2)' }}
        />
        <div
          className="absolute left-0 top-5 sm:top-[22px] transform -translate-y-1/2 h-0.5 -z-0 transition-all duration-500"
          style={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
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
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 ${!isUpcoming ? 'hover:scale-110' : ''}`}
                style={{
                  backgroundColor: isCompleted ? THEME_HEX.cyan : 'rgba(10, 13, 20, 0.9)',
                  borderColor: isCompleted
                    ? THEME_HEX.cyan
                    : isCurrent
                      ? THEME_HEX.violet
                      : 'rgba(148, 163, 184, 0.4)',
                  color: isCompleted ? '#0a0d14' : isCurrent ? THEME_HEX.violet : '#e2e8f0',
                  boxShadow: isCompleted
                    ? `0 0 12px ${THEME_HEX.cyan}60`
                    : isCurrent
                      ? `0 0 16px ${THEME_HEX.violet}50`
                      : 'none',
                  cursor: isUpcoming ? 'default' : 'pointer',
                }}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="font-bold text-sm">{index + 1}</span>
                )}
              </button>

              <span
                className="hidden sm:block mt-2 text-xs sm:text-sm font-medium font-display text-center leading-tight max-w-[7rem] sm:max-w-[8rem] break-words transition-colors duration-200 pointer-events-none"
                style={{
                  color: isCurrent ? THEME_HEX.violet : isCompleted ? THEME_HEX.cyan : '#e2e8f0',
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
