import type { CareerEvent, CareerMishap } from '../types/event.js';
import type { CareerDefinition } from '../types/career.js';
import type { DiceResult } from './dice.js';
import { roll2d6, roll1d6 } from './dice.js';

export interface EventRollResult {
  roll: DiceResult;
  event: CareerEvent;
}

export interface MishapRollResult {
  roll: DiceResult;
  mishap: CareerMishap;
}

export function rollCareerEvent(career: CareerDefinition): EventRollResult {
  const result = roll2d6();
  const event = career.events.find(e => e.roll === result.total);
  
  if (!event) {
    throw new Error(`No event found for roll ${result.total} in career ${career.id}`);
  }
  
  return { roll: result, event };
}

export function rollMishap(career: CareerDefinition): MishapRollResult {
  const result = roll1d6();
  const mishap = career.mishaps.find(m => m.roll === result.total);
  
  if (!mishap) {
    throw new Error(`No mishap found for roll ${result.total} in career ${career.id}`);
  }
  
  return { roll: result, mishap };
}

export function getCareerEvent(career: CareerDefinition, rollValue: number): CareerEvent | undefined {
  return career.events.find(e => e.roll === rollValue);
}

export function getMishap(career: CareerDefinition, rollValue: number): CareerMishap | undefined {
  return career.mishaps.find(m => m.roll === rollValue);
}
