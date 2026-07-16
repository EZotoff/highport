import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import {
  createCharacter,
  getCharacter,
  updateCharacter,
  getAllCharacters,
  setBackgroundSkills,
  advanceStatus,
} from '../lib/chargen/state';
import type { CareerTermResult, AIProvenance } from '../lib/chargen/types';

const mocks = vi.hoisted(() => {
  const state = { doc: null as Y.Doc | null };
  return {
    state,
    mockGetYDoc: vi.fn(() => {
      if (!state.doc) {
        throw new Error('mockDoc not configured');
      }
      return state.doc;
    }),
    mockAddNode: vi.fn(),
    mockAddEdge: vi.fn(),
  };
});

vi.mock('../lib/ydoc', () => ({
  getYDoc: mocks.mockGetYDoc,
}));

vi.mock('../lib/yjs-helpers', () => ({
  addNode: mocks.mockAddNode,
  addEdge: mocks.mockAddEdge,
}));

import { spawnEntity } from '../lib/chargen/entity-spawner';
import { requiresReview } from '../lib/chargen/gm-approval';

describe('Chargen Flow Integration', () => {
  describe('Character CRDT state sync between two Y.Docs', () => {
    let doc1: Y.Doc;
    let doc2: Y.Doc;

    beforeEach(() => {
      doc1 = new Y.Doc();
      doc2 = new Y.Doc();
      doc1.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc2, update);
      });
      doc2.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc1, update);
      });
    });

    afterEach(() => {
      doc1.destroy();
      doc2.destroy();
    });

    it('creates and updates a character in doc1 and syncs to doc2', () => {
      const characterId = createCharacter(doc1, 'player-1', 'Test Hero');

      const syncedCharacter = getCharacter(doc2, characterId);
      expect(syncedCharacter).not.toBeNull();
      expect(syncedCharacter?.name).toBe('Test Hero');
      expect(syncedCharacter?.playerId).toBe('player-1');

      updateCharacter(doc1, characterId, 'name', 'Updated Hero');
      updateCharacter(doc1, characterId, 'skills', { Pilot: 1, Astrogation: 0 });

      const updatedInDoc2 = getCharacter(doc2, characterId);
      expect(updatedInDoc2?.name).toBe('Updated Hero');
      expect(updatedInDoc2?.skills).toEqual({ Pilot: 1, Astrogation: 0 });
    });
  });

  describe('Graph node creation from entity spawns', () => {
    let doc: Y.Doc;

    beforeEach(() => {
      doc = new Y.Doc();
      mocks.state.doc = doc;
      mocks.mockGetYDoc.mockClear();
      mocks.mockAddNode.mockClear();
      mocks.mockAddEdge.mockClear();
    });

    afterEach(() => {
      doc.destroy();
      mocks.state.doc = null;
    });

    it('creates a graph node and edge when spawnEntity is called', () => {
      const result = spawnEntity({
        spawn: { type: 'npc', relationship: 'ally', required: false },
        name: 'Test NPC',
        characterId: 'char-1',
        termNumber: 1,
        eventRoll: 6,
      });

      expect(result.type).toBe('npc');
      expect(result.name).toBe('Test NPC');
      expect(result.graphNodeId).toBeTruthy();

      expect(mocks.mockGetYDoc).toHaveBeenCalledTimes(1);
      expect(mocks.mockAddNode).toHaveBeenCalledTimes(1);
      expect(mocks.mockAddEdge).toHaveBeenCalledTimes(1);

      const [, nodeArg] = mocks.mockAddNode.mock.calls[0];
      expect(nodeArg.type).toBe('npc');
      expect(nodeArg.label).toBe('Test NPC');
      expect(nodeArg.metadata.relationship).toBe('ally');
      expect(nodeArg.metadata.characterId).toBe('char-1');

      const [, edgeArg] = mocks.mockAddEdge.mock.calls[0];
      expect(edgeArg.source_id).toBe('char-1');
      expect(edgeArg.target_id).toBe(result.graphNodeId);
      expect(edgeArg.relation_label).toBe('Allied with');
    });

    it('stores provenance with source ai on the graph node when provided', () => {
      const provenance: AIProvenance<string> = {
        value: 'Test NPC',
        source: 'ai',
        mode: 'brief',
        status: 'draft',
        derivedFrom: 'npc-name',
        generatedAt: 1700000000000,
        pendingReviewBy: 'gm',
      };

      const result = spawnEntity({
        spawn: { type: 'npc', relationship: 'ally', required: false },
        name: 'Test NPC',
        characterId: 'char-1',
        termNumber: 1,
        eventRoll: 6,
        provenance: {
          source: provenance.source,
          status: provenance.status,
          derivedFrom: provenance.derivedFrom,
          generatedAt: provenance.generatedAt,
          pendingReviewBy: provenance.pendingReviewBy,
        },
      });

      expect(result.provenance).toBeDefined();
      expect(result.provenance?.source).toBe('ai');
      expect(result.provenance?.status).toBe('draft');
      expect(result.provenance?.pendingReviewBy).toBe('gm');
      expect(result.provenance?.generatedAt).toBe(1700000000000);

      const [, nodeArg] = mocks.mockAddNode.mock.calls[0];
      expect(nodeArg.provenance).toBeDefined();
      expect(nodeArg.provenance.source).toBe('ai');
      expect(nodeArg.provenance.status).toBe('draft');
      expect(nodeArg.provenance.pendingReviewBy).toBe('gm');
    });

    it('does not set provenance when none is provided (backward compat)', () => {
      const result = spawnEntity({
        spawn: { type: 'npc', relationship: 'contact', required: false },
        name: 'Legacy NPC',
        characterId: 'char-2',
        termNumber: 2,
        eventRoll: 3,
      });

      expect(result.provenance).toBeUndefined();

      const [, nodeArg] = mocks.mockAddNode.mock.calls[0];
      expect(nodeArg.provenance).toBeUndefined();
    });
  });

  describe('Submit button disable logic', () => {
    it('returns true when AI provenance has pendingReviewBy gm in strict mode', () => {
      const prov: AIProvenance<string> = {
        value: 'Test',
        source: 'ai',
        mode: 'brief',
        status: 'draft',
        generatedAt: Date.now(),
        pendingReviewBy: 'gm',
      };
      const nameValue = prov.value;
      const submitDisabled = !nameValue.trim() || (prov != null && requiresReview(prov, 'strict'));
      expect(submitDisabled).toBe(true);
    });

    it('returns false when pendingReviewBy is cleared (GM approved)', () => {
      const prov: AIProvenance<string> = {
        value: 'Test',
        source: 'ai',
        mode: 'brief',
        status: 'accepted',
        generatedAt: Date.now(),
        pendingReviewBy: null,
      };
      const nameValue = prov.value;
      const submitDisabled = !nameValue.trim() || (prov != null && requiresReview(prov, 'strict'));
      expect(submitDisabled).toBe(false);
    });

    it('returns false in lenient mode even with AI source', () => {
      const prov: AIProvenance<string> = {
        value: 'Test',
        source: 'ai',
        mode: 'brief',
        status: 'accepted',
        generatedAt: Date.now(),
        pendingReviewBy: null,
      };
      const nameValue = prov.value;
      const submitDisabled = !nameValue.trim() || (prov != null && requiresReview(prov, 'lenient'));
      expect(submitDisabled).toBe(false);
    });

    it('returns false for player-entered provenance (no pendingReviewBy)', () => {
      const prov: AIProvenance<string> = {
        value: 'Manual NPC',
        source: 'player',
        mode: 'brief',
        status: 'edited',
        generatedAt: Date.now(),
        pendingReviewBy: undefined,
      };
      const nameValue = prov.value;
      const submitDisabled = !nameValue.trim() || (prov != null && requiresReview(prov, 'strict'));
      expect(submitDisabled).toBe(false);
    });
  });

  describe('Full chargen flow completion', () => {
    let doc: Y.Doc;

    beforeEach(() => {
      doc = new Y.Doc();
    });

    afterEach(() => {
      doc.destroy();
    });

    it('creates character, sets background, adds term, and finalizes', () => {
      const characterId = createCharacter(doc, 'player-1', 'Test Hero');
      const created = getCharacter(doc, characterId);
      expect(created?.status).toBe('background');

      setBackgroundSkills(doc, characterId, ['Pilot', 'Astrogation', 'Vacc Suit']);
      const withBackground = getCharacter(doc, characterId);
      expect(withBackground?.backgroundSkills).toEqual(['Pilot', 'Astrogation', 'Vacc Suit']);
      expect(withBackground?.skills).toEqual({ Pilot: 0, Astrogation: 0, 'Vacc Suit': 0 });

      const term: CareerTermResult = {
        termNumber: 1,
        careerId: 'navy',
        assignmentId: 'line_crew',
        startAge: 18,
        survived: true,
        advanced: true,
        currentRank: 1,
        skillsGained: [{ skill: 'Mechanic', level: 1 }],
        spawnedEntities: [],
      };
      updateCharacter(doc, characterId, 'terms', [term]);
      updateCharacter(doc, characterId, 'currentTermIndex', 1);
      updateCharacter(doc, characterId, 'age', 22);

      const withTerm = getCharacter(doc, characterId);
      expect(withTerm?.terms).toHaveLength(1);
      expect(withTerm?.terms[0]?.careerId).toBe('navy');
      expect(withTerm?.age).toBe(22);

      advanceStatus(doc, characterId);
      expect(getCharacter(doc, characterId)?.status).toBe('career_selection');
      advanceStatus(doc, characterId);
      expect(getCharacter(doc, characterId)?.status).toBe('term_resolution');
      advanceStatus(doc, characterId);
      expect(getCharacter(doc, characterId)?.status).toBe('mustering_out');
      advanceStatus(doc, characterId);
      expect(getCharacter(doc, characterId)?.status).toBe('finalized');
    });
  });

  describe('Multiple characters in same session', () => {
    let doc: Y.Doc;

    beforeEach(() => {
      doc = new Y.Doc();
    });

    afterEach(() => {
      doc.destroy();
    });

    it('keeps each character state isolated in one Y.Doc', () => {
      const char1 = createCharacter(doc, 'player-1', 'Hero A');
      const char2 = createCharacter(doc, 'player-2', 'Hero B');

      setBackgroundSkills(doc, char1, ['Pilot', 'Gun Combat']);
      updateCharacter(doc, char1, 'skills', { Pilot: 1, 'Gun Combat': 0 });
      updateCharacter(doc, char1, 'terms', [
        {
          termNumber: 1,
          careerId: 'scout',
          assignmentId: 'courier',
          startAge: 18,
          survived: true,
          advanced: false,
          currentRank: 0,
          skillsGained: [{ skill: 'Recon', level: 1 }],
          spawnedEntities: [],
        },
      ]);

      setBackgroundSkills(doc, char2, ['Broker']);

      const c1 = getCharacter(doc, char1);
      const c2 = getCharacter(doc, char2);

      expect(c1).not.toBeNull();
      expect(c2).not.toBeNull();

      expect(c1?.name).toBe('Hero A');
      expect(c1?.skills).toEqual({ Pilot: 1, 'Gun Combat': 0 });
      expect(c1?.terms).toHaveLength(1);
      expect(c1?.terms[0]?.careerId).toBe('scout');

      expect(c2?.name).toBe('Hero B');
      expect(c2?.skills).toEqual({ Broker: 0 });
      expect(c2?.terms).toEqual([]);

      const all = getAllCharacters(doc);
      expect(all).toHaveLength(2);
      expect(all.map((c) => c.id)).toContain(char1);
      expect(all.map((c) => c.id)).toContain(char2);
    });
  });
});
