/**
 * Receive - Handle incoming node updates from Highport server
 */

// Same whitelist as sync.js (reverse direction)
const WHITELISTED_FIELDS = ['hp', 'characteristics', 'credits', 'label'];

/**
 * Map Highport metadata fields back to mgt2e actor paths
 * @param {object} changes - Highport metadata changes
 * @returns {object} Foundry actor update paths
 */
function mapToFoundryPaths(changes) {
  const foundryChanges = {};

  if (changes.hp) {
    if (changes.hp.current !== undefined) {
      foundryChanges['system.hits.value'] = changes.hp.current;
    }
    if (changes.hp.max !== undefined) {
      foundryChanges['system.hits.max'] = changes.hp.max;
    }
  }

  if (changes.characteristics) {
    for (const [key, value] of Object.entries(changes.characteristics)) {
      foundryChanges[`system.characteristics.${key}.value`] = value;
    }
  }

  if (changes.credits !== undefined) {
    foundryChanges['system.finance.cash'] = changes.credits;
  }

  if (changes.label !== undefined) {
    foundryChanges['name'] = changes.label;
  }

  return foundryChanges;
}

/**
 * Filter changes to only include whitelisted fields
 * @param {object} changes - Raw changes from Highport
 * @returns {object} Filtered changes
 */
function filterWhitelistedChanges(changes) {
  const filtered = {};
  for (const field of WHITELISTED_FIELDS) {
    if (changes[field] !== undefined) {
      filtered[field] = changes[field];
    }
  }
  return filtered;
}

/**
 * Handle incoming node_update message from Highport server
 * @param {object} msg - Message with type 'node_update'
 * @returns {Promise<object>} Result object with success status
 */
export async function handleNodeUpdate(msg) {
  const { foundryUuid, changes } = msg.payload || {};

  if (!foundryUuid || !changes) {
    console.warn('Highport Bridge: node_update missing foundryUuid');
    return { success: false, error: 'missing_foundry_uuid' };
  }

  console.log(`Highport Bridge: Received update command for actor ${foundryUuid}`);

  // Find actor by UUID
  const actor = await fromUuid(foundryUuid);
  if (!actor) {
    console.warn(`Highport Bridge: Actor not found: ${foundryUuid}`);
    return { success: false, error: 'actor_not_found' };
  }

  // Check permissions
  if (!actor.isOwner) {
    console.warn(`Highport Bridge: No permission to update actor: ${foundryUuid}`);
    return { success: false, error: 'permission_denied' };
  }

  // Check if actor is locked
  if (actor.limited && !game.user.isGM) {
    console.warn(`Highport Bridge: Actor is locked: ${foundryUuid}`);
    return { success: false, error: 'actor_locked' };
  }

  // Filter to whitelisted fields only
  const whitelistedChanges = filterWhitelistedChanges(changes);
  const foundryChanges = mapToFoundryPaths(whitelistedChanges);

  if (Object.keys(foundryChanges).length === 0) {
    console.log('Highport Bridge: No applicable changes');
    return { success: true, updated: false };
  }

  try {
    // Apply update with flag to prevent echo
    await actor.update(foundryChanges, { highport: true });
    console.log(`Highport Bridge: Updated actor ${actor.name}`, foundryChanges);
    return { success: true, updated: true };
  } catch (err) {
    console.error(`Highport Bridge: Failed to update actor ${actor.name}`, err);
    return { success: false, error: 'update_failed', message: err.message };
  }
}

export { mapToFoundryPaths, filterWhitelistedChanges, WHITELISTED_FIELDS };
