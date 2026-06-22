import * as Y from 'yjs';
import type { CharacteristicSet } from '@highport/mgt2e';
import { roll2d6, setRandomSeed, resetRandomSeed } from '@highport/mgt2e';
import { DEFAULT_SESSION_SETTINGS } from './types';
import type {
  ChargenCharacter,
  ChargenSessionConfig,
  ChargenStatus,
  CareerTermResult,
  ConnectionRequest,
  MusteringState,
  SessionSettings,
  SharedSpawnedEntity,
} from './types';

export function getChargenMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('chargen');
}

export function getCharactersMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('characters')) {
    chargen.set('characters', new Y.Map());
  }
  return chargen.get('characters') as Y.Map<Y.Map<unknown>>;
}

export function rollInitialCharacteristics(seed?: number): CharacteristicSet {
  if (seed !== undefined) {
    setRandomSeed(seed);
  }

  const characteristics: CharacteristicSet = {
    STR: roll2d6().total,
    DEX: roll2d6().total,
    END: roll2d6().total,
    INT: roll2d6().total,
    EDU: roll2d6().total,
    SOC: roll2d6().total,
  };

  if (seed !== undefined) {
    resetRandomSeed();
  }

  return characteristics;
}

export function createCharacter(doc: Y.Doc, playerId: string, name?: string): string {
  const characters = getCharactersMap(doc);
  const charId = crypto.randomUUID();

  const character: ChargenCharacter = {
    id: charId,
    playerId,
    name: name || '',
    characteristics: rollInitialCharacteristics(),
    backgroundSkills: [],
    terms: [],
    currentTermIndex: 0,
    status: 'background',
    skills: {},
    benefits: [],
    credits: 0,
    age: 18,
    spawnedEntityIds: [],
  };

  doc.transact(() => {
    const charMap = new Y.Map();
    Object.entries(character).forEach(([key, value]) => {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        charMap.set(key, JSON.parse(JSON.stringify(value)));
      } else {
        charMap.set(key, value);
      }
    });
    characters.set(charId, charMap);
  }, 'chargen-create');

  return charId;
}

export function getCharacter(doc: Y.Doc, charId: string): ChargenCharacter | null {
  const characters = getCharactersMap(doc);
  const charMap = characters.get(charId);
  if (!charMap) return null;

  return yMapToCharacter(charMap);
}

export function yMapToCharacter(yMap: Y.Map<unknown>): ChargenCharacter {
  return {
    id: yMap.get('id') as string,
    playerId: yMap.get('playerId') as string,
    name: (yMap.get('name') as string) || '',
    homeworld: yMap.get('homeworld') as string | undefined,
    characteristics: yMap.get('characteristics') as CharacteristicSet,
    backgroundSkills: (yMap.get('backgroundSkills') as string[]) || [],
    terms: (yMap.get('terms') as CareerTermResult[]) || [],
    currentTermIndex: (yMap.get('currentTermIndex') as number) || 0,
    status: (yMap.get('status') as ChargenStatus) || 'background',
    skills: (yMap.get('skills') as Record<string, number>) || {},
    benefits: (yMap.get('benefits') as string[]) || [],
    credits: (yMap.get('credits') as number) || 0,
    age: (yMap.get('age') as number) || 18,
    spawnedEntityIds: (yMap.get('spawnedEntityIds') as string[]) || [],
    dismissedSuggestions: (yMap.get('dismissedSuggestions') as string[]) || [],
    mustering: yMap.get('mustering') as MusteringState | undefined,
  };
}

export function updateCharacter<K extends keyof ChargenCharacter>(
  doc: Y.Doc,
  charId: string,
  field: K,
  value: ChargenCharacter[K],
): void {
  const characters = getCharactersMap(doc);
  const charMap = characters.get(charId);
  if (!charMap) return;

  doc.transact(() => {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      charMap.set(field as string, JSON.parse(JSON.stringify(value)));
    } else {
      charMap.set(field as string, value);
    }
  }, 'chargen-update');
}

export function updateCharacterFields(
  doc: Y.Doc,
  charId: string,
  updates: Partial<ChargenCharacter>,
): void {
  const characters = getCharactersMap(doc);
  const charMap = characters.get(charId);
  if (!charMap) return;

  doc.transact(() => {
    Object.entries(updates).forEach(([key, value]) => {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        charMap.set(key, JSON.parse(JSON.stringify(value)));
      } else {
        charMap.set(key, value);
      }
    });
  }, 'chargen-update-batch');
}

export function swapCharacteristics(
  doc: Y.Doc,
  charId: string,
  stat1: keyof CharacteristicSet,
  stat2: keyof CharacteristicSet,
): void {
  const character = getCharacter(doc, charId);
  if (!character) return;

  const newChars = { ...character.characteristics };
  const temp = newChars[stat1];
  newChars[stat1] = newChars[stat2]!;
  newChars[stat2] = temp!;

  updateCharacter(doc, charId, 'characteristics', newChars);
}

export function rerollCharacteristics(doc: Y.Doc, charId: string, seed?: number): void {
  const newChars = rollInitialCharacteristics(seed);
  updateCharacter(doc, charId, 'characteristics', newChars);
}

export function setBackgroundSkills(doc: Y.Doc, charId: string, skills: string[]): void {
  if (skills.length > 3) {
    skills = skills.slice(0, 3);
  }
  updateCharacter(doc, charId, 'backgroundSkills', skills);

  const character = getCharacter(doc, charId);
  if (character) {
    const newSkills = { ...character.skills };
    skills.forEach((skill) => {
      if (!(skill in newSkills)) {
        newSkills[skill] = 0;
      }
    });
    updateCharacter(doc, charId, 'skills', newSkills);
  }
}

export function advanceStatus(doc: Y.Doc, charId: string): void {
  const character = getCharacter(doc, charId);
  if (!character) return;

  const statusOrder: ChargenStatus[] = [
    'background',
    'career_selection',
    'term_resolution',
    'mustering_out',
    'finalized',
  ];
  const currentIndex = statusOrder.indexOf(character.status);
  if (currentIndex < statusOrder.length - 1) {
    updateCharacter(doc, charId, 'status', statusOrder[currentIndex + 1]);
  }
}

export function deleteCharacter(doc: Y.Doc, charId: string): void {
  const characters = getCharactersMap(doc);
  doc.transact(() => {
    characters.delete(charId);
  }, 'chargen-delete');
}

export function getAllCharacters(doc: Y.Doc): ChargenCharacter[] {
  const characters = getCharactersMap(doc);
  const result: ChargenCharacter[] = [];
  characters.forEach((charMap) => {
    result.push(yMapToCharacter(charMap as Y.Map<unknown>));
  });
  return result;
}

// ============================================
// Session Management Functions (Phase 4)
// ============================================

export function getSessionMap(doc: Y.Doc): Y.Map<unknown> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('session')) {
    chargen.set('session', new Y.Map());
  }
  return chargen.get('session') as Y.Map<unknown>;
}

export function createSession(doc: Y.Doc, campaignId: string, gmUserId: string): string {
  const sessionId = crypto.randomUUID();
  const sessionMap = getSessionMap(doc);

  doc.transact(() => {
    sessionMap.set('id', sessionId);
    sessionMap.set('campaignId', campaignId);
    sessionMap.set('createdAt', Date.now());
    sessionMap.set('createdBy', gmUserId);
    sessionMap.set('status', 'active');
    sessionMap.set('settings', JSON.parse(JSON.stringify(DEFAULT_SESSION_SETTINGS)));
  }, 'session-create');

  return sessionId;
}

export function getSession(doc: Y.Doc): ChargenSessionConfig | null {
  const sessionMap = getSessionMap(doc);
  if (!sessionMap.get('id')) return null;

  return {
    id: sessionMap.get('id') as string,
    campaignId: sessionMap.get('campaignId') as string,
    createdAt: sessionMap.get('createdAt') as number,
    createdBy: sessionMap.get('createdBy') as string,
    status: sessionMap.get('status') as 'active' | 'completed' | 'abandoned',
    settings: sessionMap.get('settings') as SessionSettings,
  };
}

export function updateSessionSettings(doc: Y.Doc, updates: Partial<SessionSettings>): void {
  const sessionMap = getSessionMap(doc);
  const currentSettings =
    (sessionMap.get('settings') as SessionSettings) || DEFAULT_SESSION_SETTINGS;

  doc.transact(() => {
    const newSettings = { ...currentSettings, ...updates };
    sessionMap.set('settings', JSON.parse(JSON.stringify(newSettings)));
  }, 'session-settings-update');
}

export function endSession(doc: Y.Doc): void {
  const sessionMap = getSessionMap(doc);
  doc.transact(() => {
    sessionMap.set('status', 'completed');
  }, 'session-end');
}

// ============================================
// Entity Pool Functions
// ============================================

export function getEntityPoolMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('entityPool')) {
    chargen.set('entityPool', new Y.Map());
  }
  return chargen.get('entityPool') as Y.Map<Y.Map<unknown>>;
}

export function addEntityToPool(doc: Y.Doc, entity: Omit<SharedSpawnedEntity, 'id'>): string {
  const entityPool = getEntityPoolMap(doc);
  const entityId = crypto.randomUUID();

  doc.transact(() => {
    const entityMap = new Y.Map();
    entityMap.set('id', entityId);
    Object.entries(entity).forEach(([key, value]) => {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        entityMap.set(key, JSON.parse(JSON.stringify(value)));
      } else {
        entityMap.set(key, value);
      }
    });
    entityPool.set(entityId, entityMap);
  }, 'entity-pool-add');

  return entityId;
}

export function getEntityPool(doc: Y.Doc): SharedSpawnedEntity[] {
  const entityPool = getEntityPoolMap(doc);
  const result: SharedSpawnedEntity[] = [];

  entityPool.forEach((entityMap) => {
    result.push(yMapToEntity(entityMap as Y.Map<unknown>));
  });

  return result;
}

export function getEntityFromPool(doc: Y.Doc, entityId: string): SharedSpawnedEntity | null {
  const entityPool = getEntityPoolMap(doc);
  const entityMap = entityPool.get(entityId);
  if (!entityMap) return null;
  return yMapToEntity(entityMap as Y.Map<unknown>);
}

export function yMapToEntity(yMap: Y.Map<unknown>): SharedSpawnedEntity {
  return {
    id: yMap.get('id') as string,
    type: yMap.get('type') as 'npc' | 'location' | 'item' | 'secret',
    createdBy: yMap.get('createdBy') as string,
    createdFor: yMap.get('createdFor') as string,
    createdDuring: yMap.get('createdDuring') as { termNumber: number; eventRoll: number },
    ownedBy: yMap.get('ownedBy') as string,
    name: yMap.get('name') as string,
    description: yMap.get('description') as string | undefined,
    metadata: (yMap.get('metadata') as Record<string, unknown>) || {},
    graphNodeId: yMap.get('graphNodeId') as string,
    claimedBy: (yMap.get('claimedBy') as string[]) || [],
  };
}

// ============================================
// Connection Request Functions
// ============================================

export function getConnectionRequestsArray(doc: Y.Doc): Y.Array<unknown> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('connectionRequests')) {
    chargen.set('connectionRequests', new Y.Array());
  }
  return chargen.get('connectionRequests') as Y.Array<unknown>;
}

export function getConnectionRequests(doc: Y.Doc): ConnectionRequest[] {
  const requestsArray = getConnectionRequestsArray(doc);
  return requestsArray.toArray() as ConnectionRequest[];
}

export function requestConnection(
  doc: Y.Doc,
  charId: string,
  entityId: string,
  relationship: string,
  note?: string,
  userId?: string,
): string {
  const requestsArray = getConnectionRequestsArray(doc);
  const requestId = crypto.randomUUID();

  const request: ConnectionRequest = {
    id: requestId,
    requesterId: userId || 'unknown',
    requesterCharId: charId,
    entityId,
    relationship: relationship as ConnectionRequest['relationship'],
    status: 'pending',
    note,
    createdAt: Date.now(),
  };

  doc.transact(() => {
    requestsArray.push([request]);
  }, 'connection-request');

  return requestId;
}

export function resolveConnectionRequest(
  doc: Y.Doc,
  requestId: string,
  approved: boolean,
  resolvedBy: string,
): void {
  const requestsArray = getConnectionRequestsArray(doc);
  const requests = requestsArray.toArray() as ConnectionRequest[];
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) return;

  const updatedRequest: ConnectionRequest = {
    ...requests[index],
    status: approved ? 'approved' : 'rejected',
    resolvedAt: Date.now(),
    resolvedBy,
  };

  doc.transact(() => {
    requestsArray.delete(index, 1);
    requestsArray.insert(index, [updatedRequest]);

    // If approved, update entity's claimedBy array
    if (approved) {
      const entityPool = getEntityPoolMap(doc);
      const entityMap = entityPool.get(requests[index].entityId);
      if (entityMap) {
        const claimedBy = (entityMap.get('claimedBy') as string[]) || [];
        if (!claimedBy.includes(requests[index].requesterCharId)) {
          entityMap.set('claimedBy', [...claimedBy, requests[index].requesterCharId]);
        }
      }
    }
  }, 'connection-resolve');
}

export function getEntityClaimers(doc: Y.Doc, entityId: string): string[] {
  const entity = getEntityFromPool(doc, entityId);
  return entity?.claimedBy || [];
}
