/**
 * Actor Sync - Detect Foundry actor changes and send to Highport server
 */
import { bridge } from '../module.js';

// Whitelisted paths that trigger sync
const WHITELISTED_PATHS = ['system.hits', 'system.characteristics', 'system.finance.cash', 'name'];

/**
 * Extract nested value from object using dot-notation path
 * @param {object} obj - Source object
 * @param {string} path - Dot-notation path (e.g., "system.hits.value")
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Check if any whitelisted path is present in changes
 * @param {object} changes - Foundry update changes object
 * @returns {boolean}
 */
function hasWhitelistedChanges(changes) {
  for (const path of WHITELISTED_PATHS) {
    if (getNestedValue(changes, path) !== undefined) {
      return true;
    }
  }
  return false;
}

/**
 * Build sync payload with only whitelisted fields from changes
 * @param {Actor} actor - Foundry actor document
 * @param {object} changes - Changes from updateActor hook
 * @returns {object|null} Payload or null if no relevant changes
 */
function buildSyncPayload(actor, changes) {
  const filteredChanges = {};

  // Extract whitelisted fields from changes
  for (const path of WHITELISTED_PATHS) {
    const value = getNestedValue(changes, path);
    if (value !== undefined) {
      // Map to Highport metadata structure
      if (path === 'system.hits') {
        filteredChanges['hp'] = {
          current: value.value,
          max: value.max,
        };
      } else if (path === 'system.characteristics') {
        filteredChanges['characteristics'] = {};
        for (const [key, char] of Object.entries(value)) {
          if (char && typeof char === 'object' && 'value' in char) {
            filteredChanges['characteristics'][key] = char.value;
          }
        }
      } else if (path === 'system.finance.cash') {
        filteredChanges['credits'] = value;
      } else if (path === 'name') {
        filteredChanges['label'] = value;
      }
    }
  }

  // Return null if no changes were extracted
  if (Object.keys(filteredChanges).length === 0) {
    return null;
  }

  return {
    actorId: actor.id,
    actorName: actor.name,
    changes: filteredChanges,
    foundryUuid: actor.uuid,
  };
}

/**
 * Hook: Detect actor updates and sync to Highport
 */
Hooks.on('updateActor', (actor, changes, options, userId) => {
  if (options.highport) return;

  if (!actor.hasPlayerOwner) return;

  if (userId !== game.user.id) return;

  if (!hasWhitelistedChanges(changes)) return;

  const payload = buildSyncPayload(actor, changes);
  if (payload && bridge) {
    bridge.send({
      type: 'actor_update',
      requestId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      payload,
    });
    console.log('Highport Sync: Actor update sent', payload.actorId);
  }
});

export { buildSyncPayload, hasWhitelistedChanges, WHITELISTED_PATHS };
