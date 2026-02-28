/**
 * Career data access — re-exports from the plugin loader.
 *
 * Career data is loaded at runtime from either:
 * - SRD fallback (minimal, ships with the package)
 * - External game data pack (full content, loaded via GAME_DATA_DIR or loadGameData())
 *
 * The public API is unchanged — getCareer(), getAllCareers(), CAREERS all work as before.
 */

export {
  CAREERS,
  getCareer,
  getAllCareers,
  getCareerIds,
  CRB_CAREER_IDS,
  getCrbCareerIds,
  type CrbCareerId,
} from '../../loader.js';
