import type {
  AgingEffectTier,
  CareerEvent,
  CareerMishap,
  CharacteristicSet,
  DiceResult,
  MentalCharacteristicCode,
  PhysicalCharacteristicCode,
} from '@highport/mgt2e';
import type { VerbosityLevel } from './narrative';

export type ChargenStatus =
  | 'background'
  | 'career_selection'
  | 'term_resolution'
  | 'mustering_out'
  | 'finalized';

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
  chapters: ChapterSummary[];
  currentTermIndex: number;
  status: ChargenStatus;

  skills: Record<string, number>;
  benefits: string[];
  credits: number;
  age: number;

  spawnedEntityIds: string[];
  dismissedSuggestions?: string[];
  reviewVersion?: number;
  lastReviewedFingerprint?: string;

  mustering?: MusteringState;
}

export interface ChapterSummary {
  termNumber: number;
  careerId: string;
  careerName: string;
  age: number;
  keyEventDescription: string;
  skillsGained: string[];
  rankChange?: string;
  mishap?: string;
  agingEffect?: AgingEffectTier;
  drafted: boolean;
}

/**
 * Provenance wrapper for AI-generated content.
 * Tracks source, generation mode, acceptance status, and derivation.
 */
export interface AIProvenance<T> {
  /** The actual content value */
  value: T;
  /** Who/what produced this: 'ai' | 'dice' | 'player' | 'gm' */
  source: 'ai' | 'dice' | 'player' | 'gm';
  /** Which AI mode was used: 'brief' | 'inspiration' | 'full' */
  mode: VerbosityLevel;
  /** Lifecycle status of this content */
  status: 'draft' | 'accepted' | 'rejected' | 'edited';
  /** What this was generated from (e.g., event roll result, dice values) */
  derivedFrom?: string;
  /** Optional: when this was generated */
  generatedAt?: number;
  /** Optional: userId who proposed this content for review */
  proposedBy?: string;
  /** Optional: who needs to review this ('gm' | 'player' | null) */
  pendingReviewBy?: 'gm' | 'player' | null;
  /** Optional: log of review edits/approvals */
  reviewLog?: Array<{ at: number; by: string; from: string; to: string; edit?: string }>;
}

/**
 * Unwrap an AI field that may be either AIProvenance<T> or a bare T.
 * Handles backwards compatibility with Yjs persistence of old data.
 */
export function unwrapAIField<T>(field: AIProvenance<T> | T | undefined): T | undefined {
  if (field === undefined) return undefined;
  if (typeof field === 'object' && field !== null && 'value' in field) {
    const prov = field as AIProvenance<T>;
    if (prov.status === 'rejected') return undefined;
    return prov.value;
  }
  return field as T;
}

export interface CareerTermResult {
  termNumber: number;
  careerId: string;
  assignmentId: string;
  startAge: number;

  drafted?: boolean;
  draftRoll?: DiceResult;
  survivalDmBonus?: number;

  survivalRoll?: DiceResult;
  survived: boolean;

  eventRoll?: DiceResult;
  event?: CareerEvent;
  eventChoice?: string;
  eventDescription?: AIProvenance<string> | string;

  mishap?: CareerMishap;
  mishapDescription?: AIProvenance<string> | string;

  advancementRoll?: DiceResult;
  advanced: boolean;
  rankGained?: number;
  currentRank: number;

  commissionRoll?: DiceResult;
  commissioned?: boolean;

  agingRoll?: DiceResult;
  agingEffect?: AgingEffectTier;
  agingPhysicalLosses?: PhysicalCharacteristicCode[];
  agingMentalLosses?: MentalCharacteristicCode[];

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
  allowedCareers: string[]; // Empty = all allowed
  aiVerbosity: 'brief' | 'inspiration' | 'full';
  isLocked: boolean;
  gmApprovalMode: 'moderate' | 'strict' | 'lenient';
  crossCharacterLinkMode: 'gm-mediated' | 'player-to-player';
}

/** Extended session config for multiplayer chargen */
export interface ChargenSessionConfig {
  id: string;
  campaignId: string;
  createdAt: number;
  createdBy: string; // GM user ID
  status: 'active' | 'completed' | 'abandoned';
  settings: SessionSettings;
}

/** Spawned entity in the shared pool */
export interface SharedSpawnedEntity {
  id: string;
  type: 'npc' | 'location' | 'item' | 'secret';
  createdBy: string; // User ID who spawned
  createdFor: string; // Character ID it was spawned for
  createdDuring: { termNumber: number; eventRoll: number };
  ownedBy: string; // 'gm' or user ID
  name: string;
  description?: string;
  metadata: Record<string, unknown>;
  graphNodeId: string;
  claimedBy: string[]; // Character IDs that claimed this entity
}

export type ConnectionRelationship =
  | 'ally'
  | 'contact'
  | 'rival'
  | 'enemy'
  | 'colleague'
  | 'custom';

/** Request from one player to connect to another's entity */
export interface ConnectionRequest {
  id: string;
  requesterId: string; // User ID requesting
  requesterCharId: string; // Character ID requesting
  entityId: string; // Entity being claimed
  relationship: ConnectionRelationship;
  customRelationship?: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

/** AI-generated proposal to edit a lifepath term */
export interface LifepathProposal {
  id: string;
  characterId?: string;
  type: 'coherence-edit' | 'npc-connection' | 'plot-hook';
  targetTerm: number;
  title: string;
  description: string;
  proposedEdit?: string;
  status: 'pending' | 'accepted' | 'rejected';
  generatedAt: number;
}

/** AI-generated proposal to link two player characters */
export interface CrossCharacterLinkProposal {
  id: string;
  sourceCharId: string;
  targetCharId: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  relationship: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  generatedAt: number;
  acceptedBy?: string[];
}

/** Default session settings */
export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  allowedCareers: [],
  aiVerbosity: 'inspiration',
  isLocked: false,
  gmApprovalMode: 'moderate',
  crossCharacterLinkMode: 'gm-mediated',
};
