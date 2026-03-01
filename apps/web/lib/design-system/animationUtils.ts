'use client';
import { useState, useEffect } from 'react';
import { ANIMATION_TIMING } from './visualConfig';
import { AnimationPhase } from './types';

export const getSafeAnimationClass = (animationClass: string): string => {
  return animationClass.replace('animate-text-in', 'animate-safe-in');
};

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

export function useSequenceController(
  steps: number,
  intervalTime: number | number[],
  active: boolean = true,
) {
  const [step, setStep] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;

    const currentDuration = Array.isArray(intervalTime)
      ? intervalTime[step % intervalTime.length]
      : intervalTime;

    const timer = setTimeout(() => {
      setStep((prev) => (prev + 1) % steps);
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [step, steps, intervalTime, active, reducedMotion]);

  return step;
}

export function useToggleLoop(intervalTime: number | number[], active: boolean = true) {
  const step = useSequenceController(2, intervalTime, active);
  return step === 1;
}

export function useTransitionController(targetId: string, delay = ANIMATION_TIMING.DELAY_STAGGER) {
  const [displayedId, setDisplayedId] = useState(targetId);
  const [phase, setPhase] = useState<AnimationPhase>('idle');

  useEffect(() => {
    if (targetId === displayedId) return;

    setPhase('exiting');

    const exitDuration = ANIMATION_TIMING.TRANSITION_EXIT;
    const enterDuration = ANIMATION_TIMING.TRANSITION_ENTER;

    const t1 = setTimeout(() => setPhase('waiting'), exitDuration);
    const t2 = setTimeout(() => {
      setDisplayedId(targetId);
      setPhase('entering');
    }, exitDuration + delay);
    const t3 = setTimeout(() => setPhase('idle'), exitDuration + delay + enterDuration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [targetId, displayedId, delay]);

  const getAnimationClass = () => {
    if (phase === 'exiting') return 'animate-text-out';
    if (phase === 'entering') return 'animate-text-in';
    if (phase === 'waiting') return 'opacity-0';
    return 'opacity-100 translate-y-0';
  };

  return { displayedId, animationClass: getAnimationClass(), phase };
}
