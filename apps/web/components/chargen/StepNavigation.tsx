import React from 'react';

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
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-zinc-800 -z-0" />
        
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              <button
                onClick={() => onStepClick?.(index)}
                disabled={isUpcoming}
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200
                  ${isCompleted 
                    ? 'bg-blue-500 border-blue-500 text-white' 
                    : isCurrent 
                      ? 'bg-zinc-900 border-blue-500 text-blue-400' 
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500'}
                  ${!isUpcoming ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                `}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-bold text-sm">{index + 1}</span>
                )}
              </button>
              
              <span className={`
                absolute top-12 text-sm font-medium whitespace-nowrap transition-colors duration-200
                ${isCurrent ? 'text-blue-400' : isCompleted ? 'text-zinc-300' : 'text-zinc-600'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
