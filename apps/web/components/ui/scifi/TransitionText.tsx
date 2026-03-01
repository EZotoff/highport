'use client';
import React from 'react';
import { useTransitionController } from '@/lib/design-system/animationUtils';

interface TransitionTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4';
}

export const TransitionText: React.FC<TransitionTextProps> = ({
  text,
  className = '',
  as: Component = 'span',
}) => {
  const { displayedId, animationClass } = useTransitionController(text);

  return (
    <>
      <Component className={`${className} ${animationClass} inline-block`}>{displayedId}</Component>
      <style jsx global>{`
        @keyframes text-in {
          0% {
            opacity: 0;
            transform: translateY(5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes text-out {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-5px);
          }
        }
        .animate-text-in {
          animation: text-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-text-out {
          animation: text-out 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </>
  );
};
