/**
 * Mock user for MVP identity (no auth system)
 */
export interface MockUser {
    userId: string;
    name: string;
    color: string;
    isGM: boolean;
}
/**
 * Mock character for MVP identity
 */
export interface MockCharacter {
    characterId: string;
    name: string;
    ownerId: string;
}
/**
 * Session state for current user
 */
export interface SessionState {
    user: MockUser;
    activeCharacter: MockCharacter | null;
}
//# sourceMappingURL=identity.d.ts.map