/**
 * Game Data Plugin Loader
 *
 * Provides a runtime data store for sci-fi TTRPG game data.
 * Falls back to minimal starter content when no external data pack is installed.
 *
 * To load a full data pack, either:
 * 1. Call `loadGameData()` with a GameDataPack object at startup
 * 2. Call `loadGameDataFromDirectory()` with a path to a directory of JSON files
 *
 * Environment variable `GAME_DATA_DIR` can point to an external data directory.
 *
 * JSON Format:
 * - careers.json: Record<string, CareerDefinition>
 * - skills.json: Record<string, SkillDefinition>
 */

import type { CareerDefinition } from './types/career.js';
import type { SkillDefinition } from './types/skill.js';
import { SRD_CAREERS } from './data/srd/careers.js';
import { SRD_SKILLS } from './data/srd/skills.js';

// ---------- Game Data Pack Interface ----------

export interface GameDataPack {
  careers?: Record<string, CareerDefinition>;
  skills?: Record<string, SkillDefinition>;
}

// ---------- Internal Data Store ----------

// Initialize with SRD data immediately (synchronous, no lazy loading needed)
let _careers: Record<string, CareerDefinition> = { ...SRD_CAREERS };
let _skills: Record<string, SkillDefinition> = { ...SRD_SKILLS };
let _source: 'srd' | 'plugin' = 'srd';

// ---------- Backward-compatible constants ----------

/**
 * The CAREERS record. Returns currently loaded careers.
 * Note: This is a live getter — if you load a plugin, it will reflect the new data.
 * For static access, use getCareers() which returns the current snapshot.
 */
export function getCareers(): Record<string, CareerDefinition> {
  return _careers;
}

/**
 * Backward-compatible CAREERS constant.
 * Initially contains SRD data; updated when a plugin is loaded.
 */
export const CAREERS: Record<string, CareerDefinition> = new Proxy(
  {} as Record<string, CareerDefinition>,
  {
    get(_target, prop, _receiver) {
      if (typeof prop === 'string') {
        return _careers[prop];
      }
      return undefined;
    },
    ownKeys() {
      return Object.keys(_careers);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && prop in _careers) {
        return { configurable: true, enumerable: true, value: _careers[prop] };
      }
      return undefined;
    },
    has(_target, prop) {
      return typeof prop === 'string' && prop in _careers;
    },
  },
);

/**
 * Backward-compatible SKILLS constant.
 * Initially contains SRD data; updated when a plugin is loaded.
 */
export const SKILLS: Record<string, SkillDefinition> = new Proxy(
  {} as Record<string, SkillDefinition>,
  {
    get(_target, prop, _receiver) {
      if (typeof prop === 'string') {
        return _skills[prop];
      }
      return undefined;
    },
    ownKeys() {
      return Object.keys(_skills);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && prop in _skills) {
        return { configurable: true, enumerable: true, value: _skills[prop] };
      }
      return undefined;
    },
    has(_target, prop) {
      return typeof prop === 'string' && prop in _skills;
    },
  },
);

// ---------- Career ID type ----------

/**
 * CRB career IDs — dynamically reflects loaded careers.
 * With SRD only, this contains ['drifter'].
 * With full data pack, contains all 12 CRB careers.
 */
export function getCrbCareerIds(): readonly string[] {
  return Object.keys(_careers);
}

// For backward compatibility, export a const that matches the SRD baseline.
// With a plugin loaded, use getCrbCareerIds() for the full list.
export const CRB_CAREER_IDS = ['drifter'] as const;

export type CrbCareerId = string;

// ---------- Plugin Loading ----------

/**
 * Load a complete game data pack, merging with current data.
 * This is the primary way to install a full game data pack.
 */
export function loadGameData(pack: GameDataPack): void {
  if (pack.careers) {
    _careers = { ..._careers, ...pack.careers };
  }
  if (pack.skills) {
    _skills = { ..._skills, ...pack.skills };
  }
  _source = 'plugin';
}

/**
 * Load game data from a directory of JSON files.
 Expected files: careers.json, skills.json
 * 
 * This is an async operation (reads files from disk).
 * Only works in Node.js environments (server-side).
 */
export async function loadGameDataFromDirectory(dirPath: string): Promise<void> {
  // Dynamic import for Node.js fs (won't be bundled in browser)
  const fs = await import(/* webpackIgnore: true */ 'node:fs');
  const path = await import(/* webpackIgnore: true */ 'node:path');

  const readJsonFile = (filename: string): unknown | undefined => {
    const filePath = path.join(dirPath, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return undefined;
  };

  const pack: GameDataPack = {};

  const careers = readJsonFile('careers.json');
  if (careers) pack.careers = careers as Record<string, CareerDefinition>;

  const skills = readJsonFile('skills.json');
  if (skills) pack.skills = skills as Record<string, SkillDefinition>;

  loadGameData(pack);
}

/**
 * Initialize game data, checking GAME_DATA_DIR env var first.
 * SRD is already loaded by default — this only needs to be called
 * if you want to load from GAME_DATA_DIR.
 */
export async function initGameData(): Promise<void> {
  if (_source === 'plugin') return; // Already loaded plugin data

  // Check for external data directory
  const dataDir = typeof process !== 'undefined' ? process.env?.GAME_DATA_DIR : undefined;
  if (dataDir) {
    try {
      await loadGameDataFromDirectory(dataDir);
    } catch (err) {
      console.warn(
        `[mgt2e] Failed to load game data from ${dataDir}:`,
        err instanceof Error ? err.message : err,
      );
      console.warn('[mgt2e] Falling back to SRD content.');
    }
  }
}

// ---------- Data Access API ----------

/** Get a single career by ID */
export function getCareer(id: string): CareerDefinition | undefined {
  return _careers[id];
}

/** Get all careers as an array */
export function getAllCareers(): CareerDefinition[] {
  return Object.values(_careers);
}

/** Get all career IDs */
export function getCareerIds(): string[] {
  return Object.keys(_careers);
}

/** Get the full skills registry */
export function getSkills(): Record<string, SkillDefinition> {
  return _skills;
}

/** Get a single skill by ID */
export function getSkill(id: string): SkillDefinition | undefined {
  return _skills[id];
}

/** Get background-eligible skills */
export function getBackgroundSkills(): SkillDefinition[] {
  return Object.values(_skills).filter((s) => s.background);
}

/** Get combat skills */
export function getCombatSkills(): SkillDefinition[] {
  return Object.values(_skills).filter((s) => s.combat || s.specialties?.some((sp) => sp.combat));
}

/** Get psionic skills */
export function getPsionicSkills(): SkillDefinition[] {
  return Object.values(_skills).filter((s) => s.psionic);
}

/** Get all skill IDs */
export function getAllSkillIds(): string[] {
  return Object.keys(_skills);
}

// ---------- Status ----------

/** The source of the currently loaded data */
export function getDataSource(): 'srd' | 'plugin' {
  return _source;
}

/**
 * Get a human-readable message about data availability.
 * Useful for displaying in the UI.
 */
export function getDataStatusMessage(): string {
  if (_source === 'srd') {
    return 'Using starter content. Install a full game data pack for complete content.';
  }
  return `Game data loaded from plugin (${Object.keys(_careers).length} careers, ${Object.keys(_skills).length} skills).`;
}

/**
 * Reset the data store to SRD defaults. Primarily for testing.
 */
export function resetGameData(): void {
  _careers = { ...SRD_CAREERS };
  _skills = { ...SRD_SKILLS };
  _source = 'srd';
}
