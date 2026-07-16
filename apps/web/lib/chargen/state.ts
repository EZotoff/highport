import * as Y from 'yjs';
import { getNodesMap, getEdgesMap } from '../ydoc';
import { addEdge } from '../yjs-helpers';
import type { GraphEdge } from '@highport/shared/types/graph';
import type { CharacteristicSet } from '@highport/mgt2e';
import { getCareer, roll2d6, setRandomSeed, resetRandomSeed } from '@highport/mgt2e';
import { DEFAULT_SESSION_SETTINGS, unwrapAIField, type AIProvenance } from './types';
import { deleteCharacterSnapshot, saveCharacterSnapshot } from './persistence';
import type {
  ChapterSummary,
  ChargenCharacter,
  ChargenSessionConfig,
  ChargenStatus,
  CareerTermResult,
  ConnectionRequest,
  LifepathProposal,
  CrossCharacterLinkProposal,
  MusteringState,
  SessionSettings,
  SharedSpawnedEntity,
} from './types';

export { restoreCharacterSnapshot } from './persistence';

function formatChapterSkill(skillGain: CareerTermResult['skillsGained'][number]): string {
  const skillName = skillGain.specialty
    ? `${skillGain.skill} (${skillGain.specialty})`
    : skillGain.skill;
  return `${skillName} ${skillGain.level}`;
}

function describeRankChange(term: CareerTermResult): string | undefined {
  if (term.rankGained && term.rankGained > 0) {
    return `Promoted to Rank ${term.currentRank}`;
  }
  if (term.advancementRoll) {
    return 'No promotion recorded';
  }
  return undefined;
}

function describeTermEvent(term: CareerTermResult, careerName: string): string {
  const narrativeDescription = unwrapAIField(term.eventDescription);
  if (narrativeDescription) return narrativeDescription;
  if (term.mishap?.description) return term.mishap.description;
  if (term.event?.description) return term.event.description;
  if (term.drafted)
    return `Conscripted into ${careerName}, the term passed into the official rolls.`;
  return `A term in ${careerName} passed into the official rolls.`;
}

function summarizeCompletedTerm(term: CareerTermResult): ChapterSummary {
  const careerName = getCareer(term.careerId)?.name ?? term.careerId;
  return {
    termNumber: term.termNumber,
    careerId: term.careerId,
    careerName,
    age: term.startAge + 4,
    keyEventDescription: describeTermEvent(term, careerName),
    skillsGained: term.skillsGained.map(formatChapterSkill),
    rankChange: describeRankChange(term),
    mishap: term.mishap?.description,
    agingEffect: term.agingEffect,
    drafted: term.drafted === true,
  };
}

function mirrorCompletedChapters(
  character: ChargenCharacter,
  updates: Partial<ChargenCharacter>,
): Partial<ChargenCharacter> {
  if (updates.chapters || (!updates.terms && updates.age === undefined)) {
    return updates;
  }

  const terms = updates.terms ?? character.terms;
  const age = updates.age ?? character.age;
  const existingChapters = character.chapters ?? [];
  const completedTerms = terms.filter((term) => term.startAge + 4 <= age);

  if (completedTerms.length === 0 || existingChapters.length >= completedTerms.length) {
    return updates;
  }

  const existingByTerm = new Map(existingChapters.map((chapter) => [chapter.termNumber, chapter]));
  return {
    ...updates,
    chapters: completedTerms.map(
      (term) => existingByTerm.get(term.termNumber) ?? summarizeCompletedTerm(term),
    ),
  };
}

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
    chapters: [],
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
  saveCharacterSnapshot(character);

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
    chapters: (yMap.get('chapters') as ChapterSummary[]) || [],
    currentTermIndex: (yMap.get('currentTermIndex') as number) || 0,
    status: (yMap.get('status') as ChargenStatus) || 'background',
    skills: (yMap.get('skills') as Record<string, number>) || {},
    benefits: (yMap.get('benefits') as string[]) || [],
    credits: (yMap.get('credits') as number) || 0,
    age: (yMap.get('age') as number) || 18,
    spawnedEntityIds: (yMap.get('spawnedEntityIds') as string[]) || [],
    dismissedSuggestions: (yMap.get('dismissedSuggestions') as string[]) || [],
    reviewVersion: yMap.get('reviewVersion') as number | undefined,
    lastReviewedFingerprint: yMap.get('lastReviewedFingerprint') as string | undefined,
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
  saveCharacterSnapshot(yMapToCharacter(charMap));
}

export function updateCharacterFields(
  doc: Y.Doc,
  charId: string,
  updates: Partial<ChargenCharacter>,
): void {
  const characters = getCharactersMap(doc);
  const charMap = characters.get(charId);
  if (!charMap) return;
  const updatesWithChapters = mirrorCompletedChapters(yMapToCharacter(charMap), updates);

  doc.transact(() => {
    Object.entries(updatesWithChapters).forEach(([key, value]) => {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
        charMap.set(key, JSON.parse(JSON.stringify(value)));
      } else {
        charMap.set(key, value);
      }
    });
  }, 'chargen-update-batch');
  saveCharacterSnapshot(yMapToCharacter(charMap));
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
  deleteCharacterSnapshot(charId);
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

// ============================================
// Lifepath Proposal Functions (Phase 4)
// ============================================

export function getLifepathProposalsMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('lifepathProposals')) {
    chargen.set('lifepathProposals', new Y.Map());
  }
  return chargen.get('lifepathProposals') as Y.Map<Y.Map<unknown>>;
}

export function yMapToLifepathProposal(proposalMap: Y.Map<unknown>): LifepathProposal {
  return {
    id: proposalMap.get('id') as string,
    type: proposalMap.get('type') as LifepathProposal['type'],
    targetTerm: proposalMap.get('targetTerm') as number,
    title: proposalMap.get('title') as string,
    description: proposalMap.get('description') as string,
    proposedEdit: proposalMap.get('proposedEdit') as string | undefined,
    status: proposalMap.get('status') as LifepathProposal['status'],
    generatedAt: proposalMap.get('generatedAt') as number,
    characterId: proposalMap.get('characterId') as string | undefined,
  };
}

export function getLifepathProposals(doc: Y.Doc): LifepathProposal[] {
  return Array.from(getLifepathProposalsMap(doc).values(), yMapToLifepathProposal);
}

export function addLifepathProposal(
  doc: Y.Doc,
  proposal: Omit<LifepathProposal, 'id' | 'status' | 'generatedAt'> & {
    status?: LifepathProposal['status'];
  },
): string {
  const proposalsMap = getLifepathProposalsMap(doc);
  const proposalId = crypto.randomUUID();

  const fullProposal: LifepathProposal = {
    ...proposal,
    id: proposalId,
    status: proposal.status ?? 'pending',
    generatedAt: Date.now(),
  };

  doc.transact(() => {
    proposalsMap.set(proposalId, new Y.Map(Object.entries(fullProposal)));
  }, 'lifepath-proposal-add');

  return proposalId;
}

export function resolveLifepathProposal(doc: Y.Doc, proposalId: string, accepted: boolean): void {
  const proposalMap = getLifepathProposalsMap(doc).get(proposalId);
  if (!proposalMap) return;

  doc.transact(() => {
    proposalMap.set('status', accepted ? 'accepted' : 'rejected');
  }, 'lifepath-proposal-resolve');
}

export function removeLifepathProposal(doc: Y.Doc, proposalId: string): void {
  doc.transact(() => {
    getLifepathProposalsMap(doc).delete(proposalId);
  }, 'lifepath-proposal-remove');
}

// ============================================
// Cross-Character Link Functions (Phase 4)
// ============================================

export function getCrossCharacterLinksMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('crossCharacterLinks')) {
    chargen.set('crossCharacterLinks', new Y.Map());
  }
  return chargen.get('crossCharacterLinks') as Y.Map<Y.Map<unknown>>;
}

export function yMapToCrossCharacterLink(linkMap: Y.Map<unknown>): CrossCharacterLinkProposal {
  const acceptedByMap = linkMap.get('acceptedBy');
  const acceptedBy = acceptedByMap instanceof Y.Map ? Array.from(acceptedByMap.keys()) : [];
  return {
    id: linkMap.get('id') as string,
    sourceCharId: linkMap.get('sourceCharId') as string,
    targetCharId: linkMap.get('targetCharId') as string,
    sourceEntityId: linkMap.get('sourceEntityId') as string | undefined,
    targetEntityId: linkMap.get('targetEntityId') as string | undefined,
    relationship: linkMap.get('relationship') as string,
    description: linkMap.get('description') as string,
    status: linkMap.get('status') as CrossCharacterLinkProposal['status'],
    generatedAt: linkMap.get('generatedAt') as number,
    ...(acceptedBy.length > 0 ? { acceptedBy } : {}),
  };
}

export function getCrossCharacterLinks(doc: Y.Doc): CrossCharacterLinkProposal[] {
  return Array.from(getCrossCharacterLinksMap(doc).values(), yMapToCrossCharacterLink);
}

export function addCrossCharacterLink(
  doc: Y.Doc,
  link: Omit<CrossCharacterLinkProposal, 'id' | 'status' | 'generatedAt'>,
): string {
  const linksMap = getCrossCharacterLinksMap(doc);
  const linkId = crypto.randomUUID();

  const fullLink: CrossCharacterLinkProposal = {
    ...link,
    id: linkId,
    status: 'pending',
    generatedAt: Date.now(),
  };
  const acceptedBy = fullLink.acceptedBy ?? [];
  const linkMap = new Y.Map<unknown>(Object.entries(fullLink));
  linkMap.set('acceptedBy', new Y.Map(acceptedBy.map((characterId) => [characterId, true])));

  doc.transact(() => {
    linksMap.set(linkId, linkMap);
  }, 'cross-character-link-add');

  return linkId;
}

export function resolveCrossCharacterLink(doc: Y.Doc, linkId: string, accepted: boolean): void {
  const linkMap = getCrossCharacterLinksMap(doc).get(linkId);
  if (!linkMap) return;

  doc.transact(() => {
    linkMap.set('status', accepted ? 'accepted' : 'rejected');
  }, 'cross-character-link-resolve');
}

export function removeCrossCharacterLink(doc: Y.Doc, linkId: string): void {
  doc.transact(() => {
    getCrossCharacterLinksMap(doc).delete(linkId);
  }, 'cross-character-link-remove');
}

export function findNodeIdByChargenId(doc: Y.Doc, chargenId: string): string | null {
  const nodes = getNodesMap(doc);
  let foundId: string | null = null;
  nodes.forEach((nodeMap, id) => {
    const metadata = nodeMap.get('metadata');
    if (
      typeof metadata === 'object' &&
      metadata !== null &&
      'chargenId' in metadata &&
      metadata.chargenId === chargenId
    ) {
      foundId = id;
    }
  });
  return foundId;
}

export function createCrossCharacterLinkEdge(
  doc: Y.Doc,
  link: Pick<CrossCharacterLinkProposal, 'sourceCharId' | 'targetCharId' | 'relationship'>,
): void {
  const sourceNodeId = findNodeIdByChargenId(doc, link.sourceCharId);
  const targetNodeId = findNodeIdByChargenId(doc, link.targetCharId);
  if (!sourceNodeId || !targetNodeId) return;

  const edges = getEdgesMap(doc);
  let edgeExists = false;
  edges.forEach((edgeMap) => {
    const sourceId = edgeMap.get('source_id');
    const targetId = edgeMap.get('target_id');
    if (
      (sourceId === sourceNodeId && targetId === targetNodeId) ||
      (sourceId === targetNodeId && targetId === sourceNodeId)
    ) {
      edgeExists = true;
    }
  });

  if (edgeExists) return;

  const edge: GraphEdge = {
    id: crypto.randomUUID(),
    source_id: sourceNodeId,
    target_id: targetNodeId,
    relation_label: link.relationship,
    type: 'directional',
    weight: 1,
    style: 'solid',
    color: '#71717a',
    hidden: false,
  };
  addEdge(doc, edge);
}

export function acceptCrossCharacterLink(doc: Y.Doc, linkId: string, characterId: string): void {
  const linkMap = getCrossCharacterLinksMap(doc).get(linkId);
  if (!linkMap) return;
  const acceptedBy = linkMap.get('acceptedBy');
  if (!(acceptedBy instanceof Y.Map) || acceptedBy.has(characterId)) return;
  const link = yMapToCrossCharacterLink(linkMap);
  const bothAccepted =
    (characterId === link.sourceCharId || acceptedBy.has(link.sourceCharId)) &&
    (characterId === link.targetCharId || acceptedBy.has(link.targetCharId));

  doc.transact(() => {
    acceptedBy.set(characterId, true);
    linkMap.set('status', bothAccepted ? 'accepted' : 'pending');

    if (bothAccepted) {
      createCrossCharacterLinkEdge(doc, link);
    }
  }, 'cross-character-link-accept');
}

export function resolveAIDraft(
  doc: Y.Doc,
  characterId: string,
  termNumber: number,
  fieldPath: 'eventDescription' | 'mishapDescription',
  action: 'accept' | 'reject' | 'edit',
  editedValue?: string,
): boolean {
  const characters = getCharactersMap(doc);
  const charMap = characters.get(characterId);
  if (!charMap) return false;

  const terms = (charMap.get('terms') as CareerTermResult[]) || [];

  const termIndex = terms.findIndex((term) => {
    if (term.termNumber !== termNumber) return false;
    const field = term[fieldPath];
    if (typeof field === 'object' && field !== null && 'value' in field) {
      const prov = field as AIProvenance<string>;
      return prov.pendingReviewBy === 'gm';
    }
    return false;
  });

  if (termIndex === -1) return false;

  const now = Date.now();

  doc.transact(() => {
    const updatedTerms: CareerTermResult[] = terms.map((t, i) => {
      if (i !== termIndex) return t;
      return { ...t };
    });
    const term = updatedTerms[termIndex];
    const currentField = term[fieldPath] as AIProvenance<string>;

    const targetStatus =
      action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'edited';

    const reviewEntry: { at: number; by: string; from: string; to: string; edit?: string } = {
      at: now,
      by: 'gm',
      from: currentField.status,
      to: targetStatus,
    };
    if (editedValue !== undefined) {
      reviewEntry.edit = editedValue;
    }

    const updatedField: AIProvenance<string> = {
      ...currentField,
      status: targetStatus as AIProvenance<string>['status'],
      pendingReviewBy: null,
      reviewLog: [...(currentField.reviewLog || []), reviewEntry],
    };

    if (action === 'edit') {
      updatedField.source = 'gm';
      if (editedValue !== undefined) {
        updatedField.value = editedValue;
      }
    }

    if (fieldPath === 'eventDescription') {
      (updatedTerms[termIndex] as CareerTermResult).eventDescription = updatedField;
    } else {
      (updatedTerms[termIndex] as CareerTermResult).mishapDescription = updatedField;
    }
    charMap.set('terms', JSON.parse(JSON.stringify(updatedTerms)));
  }, 'ai-draft-resolve');

  saveCharacterSnapshot(yMapToCharacter(charMap));
  return true;
}
