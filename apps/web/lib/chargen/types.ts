import type { CharacteristicSet, DiceResult, CareerEvent, CareerMishap } from '@highport/mgt2e';

export type ChargenStatus = 'background' | 'career_selection' | 'term_resolution' | 'mustering_out' | 'finalized';

export interface ChargenSession {
  id: string;
  campaignId: string;
  startedAt: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface ChargenCharacter {
  id: string;
  playerId: string;
  name: string;
  
  homeworld?: string;
  characteristics: CharacteristicSet;
  backgroundSkills: string[];
  
  terms: CareerTermResult[];
  currentTermIndex: number;
  status: ChargenStatus;
  
  skills: Record<string, number>;
  benefits: string[];
  credits: number;
  age: number;
  
  spawnedEntityIds: string[];
}

export interface CareerTermResult {
  termNumber: number;
  careerId: string;
  assignmentId: string;
  startAge: number;
  
  survivalRoll?: DiceResult;
  survived: boolean;
  
  eventRoll?: DiceResult;
  event?: CareerEvent;
  eventChoice?: string;
  eventDescription?: string;
  
  mishap?: CareerMishap;
  
  advancementRoll?: DiceResult;
  advanced: boolean;
  rankGained?: number;
  currentRank: number;
  
  commissionRoll?: DiceResult;
  commissioned?: boolean;
  
  skillsGained: Array<{ skill: string; specialty?: string; level: number }>;
  
  spawnedEntities: SpawnedEntityRef[];
}

export interface SpawnedEntityRef {
  type: 'npc' | 'location' | 'item' | 'secret';
  graphNodeId: string;
  relationship?: 'ally' | 'contact' | 'rival' | 'enemy';
  name: string;
  description?: string;
}

export interface MusteringState {
  totalRolls: number;
  rollsUsed: number;
  cashRollsUsed: number;
  benefits: string[];
  credits: number;
  shipShares: number;
}

// ============================================
// Multiplayer Session Types (Phase 4)
// ============================================

/** Session settings controlled by GM */
export interface SessionSettings {
  allowedCareers: string[];  // Empty = all allowed
  aiVerbosity: 'minimal' | 'structured' | 'rich';
  requireGMApproval: boolean;
  allowCrossPlayerConnections: boolean;
  isLocked: boolean;
}

/** Extended session config for multiplayer chargen */
export interface ChargenSessionConfig {
  id: string;
  campaignId: string;
  createdAt: number;
  createdBy: string;  // GM user ID
  status: 'active' | 'completed' | 'abandoned';
  settings: SessionSettings;
}

/** Spawned entity in the shared pool */
export interface SharedSpawnedEntity {
  id: string;
  type: 'npc' | 'location' | 'item' | 'secret';
  createdBy: string;      // User ID who spawned
  createdFor: string;     // Character ID it was spawned for
  createdDuring: { termNumber: number; eventRoll: number };
  ownedBy: string;        // 'gm' or user ID
  name: string;
  description?: string;
  metadata: Record<string, unknown>;
  graphNodeId: string;
  claimedBy: string[];    // Character IDs that claimed this entity
}

export type ConnectionRelationship = 'ally' | 'contact' | 'rival' | 'enemy' | 'colleague' | 'custom';

/** Request from one player to connect to another's entity */
export interface ConnectionRequest {
  id: string;
  requesterId: string;        // User ID requesting
  requesterCharId: string;    // Character ID requesting
  entityId: string;           // Entity being claimed
  relationship: ConnectionRelationship;
  customRelationship?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

/** Default session settings */
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  allowedCareers: [],
  aiVerbosity: 'structured',
  requireGMApproval: false,
  allowCrossPlayerConnections: true,
  isLocked: false,
};
