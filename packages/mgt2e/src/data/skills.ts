/**
 * Skill data access — re-exports from the plugin loader.
 *
 * Skill data is loaded at runtime from either:
 * - SRD fallback (skill names + metadata, ships with the package)
 * - External game data pack (full content with descriptions, loaded via GAME_DATA_DIR or loadGameData())
 *
 * The public API is unchanged — getSkill(), SKILLS, etc. all work as before.
 */

export {
  SKILLS,
  getSkills,
  getSkill,
  getBackgroundSkills,
  getCombatSkills,
  getPsionicSkills,
  getAllSkillIds,
} from '../loader.js';
