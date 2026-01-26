/**
 * Generate a prefixed ID with a UUID suffix
 * @param prefix - The prefix for the ID (e.g., 'node', 'edge', 'user')
 * @returns A string in the format `{prefix}_{uuid}` where uuid has no hyphens
 */
export function generateId(prefix) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}
/**
 * Generate a campaign ID
 * @returns A string in the format `campaign_{uuid}`
 */
export function generateCampaignId() {
    return generateId('campaign');
}
/**
 * Generate a node ID
 * @returns A string in the format `node_{uuid}`
 */
export function generateNodeId() {
    return generateId('node');
}
/**
 * Generate a user ID
 * @returns A string in the format `user_{uuid}`
 */
export function generateUserId() {
    return generateId('user');
}
/**
 * Generate a character ID
 * @returns A string in the format `char_{uuid}`
 */
export function generateCharacterId() {
    return generateId('char');
}
/**
 * Generate an edge ID
 * @returns A string in the format `edge_{uuid}`
 */
export function generateEdgeId() {
    return generateId('edge');
}
/**
 * Generate a knowledge grant ID
 * @returns A string in the format `grant_{uuid}`
 */
export function generateKnowledgeGrantId() {
    return generateId('grant');
}
