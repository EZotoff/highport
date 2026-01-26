/**
 * Generate a prefixed ID with a UUID suffix
 * @param prefix - The prefix for the ID (e.g., 'node', 'edge', 'user')
 * @returns A string in the format `{prefix}_{uuid}` where uuid has no hyphens
 */
export declare function generateId(prefix: string): string;
/**
 * Generate a campaign ID
 * @returns A string in the format `campaign_{uuid}`
 */
export declare function generateCampaignId(): string;
/**
 * Generate a node ID
 * @returns A string in the format `node_{uuid}`
 */
export declare function generateNodeId(): string;
/**
 * Generate a user ID
 * @returns A string in the format `user_{uuid}`
 */
export declare function generateUserId(): string;
/**
 * Generate a character ID
 * @returns A string in the format `char_{uuid}`
 */
export declare function generateCharacterId(): string;
/**
 * Generate an edge ID
 * @returns A string in the format `edge_{uuid}`
 */
export declare function generateEdgeId(): string;
/**
 * Generate a knowledge grant ID
 * @returns A string in the format `grant_{uuid}`
 */
export declare function generateKnowledgeGrantId(): string;
//# sourceMappingURL=id.d.ts.map