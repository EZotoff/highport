import type { CareerDefinition } from '../../types/career.js';
import { AGENT } from './agent.js';
import { ARMY } from './army.js';
import { CITIZEN } from './citizen.js';
import { DRIFTER } from './drifter.js';
import { ENTERTAINER } from './entertainer.js';
import { MARINES } from './marines.js';
import { MERCHANT } from './merchant.js';
import { NAVY } from './navy.js';
import { NOBLE } from './noble.js';
import { ROGUE } from './rogue.js';
import { SCHOLAR } from './scholar.js';
import { SCOUT } from './scout.js';

export const CAREERS: Record<string, CareerDefinition> = {
  agent: AGENT,
  army: ARMY,
  citizen: CITIZEN,
  drifter: DRIFTER,
  entertainer: ENTERTAINER,
  marines: MARINES,
  merchant: MERCHANT,
  navy: NAVY,
  noble: NOBLE,
  rogue: ROGUE,
  scholar: SCHOLAR,
  scout: SCOUT,
};

export function getCareer(id: string): CareerDefinition | undefined {
  return CAREERS[id];
}

export function getAllCareers(): CareerDefinition[] {
  return Object.values(CAREERS);
}

export function getCareerIds(): string[] {
  return Object.keys(CAREERS);
}

// CRB career IDs for reference
export const CRB_CAREER_IDS = [
  'agent',
  'army',
  'citizen',
  'drifter',
  'entertainer',
  'marines',
  'merchant',
  'navy',
  'noble',
  'rogue',
  'scholar',
  'scout',
] as const;

export type CrbCareerId = typeof CRB_CAREER_IDS[number];

// Re-export individual careers
export { AGENT } from './agent.js';
export { ARMY } from './army.js';
export { CITIZEN } from './citizen.js';
export { DRIFTER } from './drifter.js';
export { ENTERTAINER } from './entertainer.js';
export { MARINES } from './marines.js';
export { MERCHANT } from './merchant.js';
export { NAVY } from './navy.js';
export { NOBLE } from './noble.js';
export { ROGUE } from './rogue.js';
export { SCHOLAR } from './scholar.js';
export { SCOUT } from './scout.js';
