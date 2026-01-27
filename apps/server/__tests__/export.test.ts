import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import * as Y from 'yjs';
import { registerExportRoutes, extractNodesFromYDoc, nodeToFoundryActor, matchActorsToNodes } from '../src/routes/export.js';

vi.mock('../src/ws/hocuspocus.js', () => ({
  fetchDocumentState: vi.fn(),
}));

import { fetchDocumentState } from '../src/ws/hocuspocus.js';
const mockFetchDocumentState = vi.mocked(fetchDocumentState);

function createTestYDocState(): Uint8Array {
  const doc = new Y.Doc();
  const nodesMap = doc.getMap('nodes');
  
  const node1 = new Y.Map<unknown>();
  node1.set('id', 'node_1');
  node1.set('type', 'traveller');
  node1.set('label', 'Test Character');
  node1.set('position', { x: 100, y: 200 });
  node1.set('metadata', {
    foundry_uuid: 'Actor.abc123',
    hp: { current: 10, max: 20 },
    characteristics: { str: 8, dex: 9 },
    credits: 5000,
  });
  node1.set('locked', false);
  node1.set('hidden', false);
  node1.set('created_at', Date.now());
  node1.set('created_by', 'user_1');
  
  const node2 = new Y.Map<unknown>();
  node2.set('id', 'node_2');
  node2.set('type', 'npc');
  node2.set('label', 'Merchant NPC');
  node2.set('position', { x: 300, y: 400 });
  node2.set('metadata', { description: 'A merchant' });
  node2.set('locked', false);
  node2.set('hidden', false);
  node2.set('created_at', Date.now());
  node2.set('created_by', 'user_1');
  
  const node3 = new Y.Map<unknown>();
  node3.set('id', 'node_3');
  node3.set('type', 'world');
  node3.set('label', 'Planet Alpha');
  node3.set('position', { x: 500, y: 600 });
  node3.set('metadata', {});
  node3.set('locked', false);
  node3.set('hidden', false);
  node3.set('created_at', Date.now());
  node3.set('created_by', 'user_1');
  
  nodesMap.set('node_1', node1);
  nodesMap.set('node_2', node2);
  nodesMap.set('node_3', node3);
  
  return Y.encodeStateAsUpdate(doc);
}

describe('Export Routes', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify();
    await registerExportRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/export/actors', () => {
    it('returns empty array when no document state exists', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/export/actors',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.actors).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns traveller and npc nodes as Foundry actors', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/export/actors',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.actors).toHaveLength(2);
      expect(body.count).toBe(2);
      
      const testChar = body.actors.find((a: { name: string }) => a.name === 'Test Character');
      expect(testChar).toBeDefined();
      expect(testChar._id).toBe('abc123');
      expect(testChar.system.hits).toEqual({ value: 10, max: 20 });
      expect(testChar.system.characteristics).toEqual({ str: { value: 8 }, dex: { value: 9 } });
      expect(testChar.system.finance).toEqual({ cash: 5000 });
    });

    it('accepts campaignId query parameter', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      await fastify.inject({
        method: 'GET',
        url: '/api/export/actors?campaignId=custom_campaign',
      });

      expect(mockFetchDocumentState).toHaveBeenCalledWith('custom_campaign:graph');
    });
  });

  describe('GET /api/export/json', () => {
    it('returns JSON with download headers', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/export/json',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toBe('attachment; filename="planeshift-export.json"');
    });
  });

  describe('POST /api/import/actors', () => {
    it('returns error when actors array is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/import/actors',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('actors array required');
    });

    it('returns all unmatched when no document state exists', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(null);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/import/actors',
        payload: {
          actors: [{ _id: 'unknown', name: 'Unknown Actor', type: 'traveller', system: {} }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.matched).toHaveLength(0);
      expect(body.unmatched).toHaveLength(1);
      expect(body.updated).toBe(0);
    });

    it('matches actors by foundry_uuid', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/import/actors',
        payload: {
          actors: [{
            _id: 'abc123',
            name: 'Different Name',
            type: 'traveller',
            system: {
              hits: { value: 15, max: 25 },
              finance: { cash: 10000 },
            },
          }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.matched).toHaveLength(1);
      expect(body.matched[0].nodeId).toBe('node_1');
      expect(body.changes).toHaveLength(1);
      expect(body.changes[0].metadata.hp).toEqual({ current: 15, max: 25 });
    });

    it('matches actors by name (case-insensitive)', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/import/actors',
        payload: {
          actors: [{
            _id: 'new_id',
            name: 'test character',
            type: 'traveller',
            system: {},
          }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.matched).toHaveLength(1);
      expect(body.matched[0].nodeId).toBe('node_1');
    });

    it('reports unmatched actors', async () => {
      mockFetchDocumentState.mockResolvedValueOnce(createTestYDocState());

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/import/actors',
        payload: {
          actors: [
            { _id: 'abc123', name: 'Test Character', type: 'traveller', system: {} },
            { _id: 'unknown', name: 'Unknown Actor', type: 'traveller', system: {} },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.matched).toHaveLength(1);
      expect(body.unmatched).toHaveLength(1);
      expect(body.unmatched[0].name).toBe('Unknown Actor');
    });
  });
});

describe('Helper Functions', () => {
  describe('extractNodesFromYDoc', () => {
    it('extracts nodes from Y.Doc state', () => {
      const state = createTestYDocState();
      const nodes = extractNodesFromYDoc(state);
      
      expect(nodes).toHaveLength(3);
      expect(nodes.find(n => n.id === 'node_1')?.label).toBe('Test Character');
    });
  });

  describe('nodeToFoundryActor', () => {
    it('converts node to Foundry actor format', () => {
      const node = {
        id: 'node_1',
        type: 'traveller',
        label: 'Hero',
        position: { x: 0, y: 0 },
        metadata: {
          foundry_uuid: 'Actor.xyz',
          hp: { current: 5, max: 10 },
          characteristics: { str: 7 },
          credits: 1000,
        },
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user',
      };
      
      const actor = nodeToFoundryActor(node);
      
      expect(actor._id).toBe('xyz');
      expect(actor.name).toBe('Hero');
      expect(actor.system.hits).toEqual({ value: 5, max: 10 });
      expect(actor.system.characteristics).toEqual({ str: { value: 7 } });
      expect(actor.system.finance).toEqual({ cash: 1000 });
    });

    it('uses node id when no foundry_uuid', () => {
      const node = {
        id: 'node_fallback',
        type: 'traveller',
        label: 'New Character',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user',
      };
      
      const actor = nodeToFoundryActor(node);
      expect(actor._id).toBe('node_fallback');
    });
  });

  describe('matchActorsToNodes', () => {
    const nodes = [
      {
        id: 'n1',
        type: 'traveller',
        label: 'Alice',
        position: { x: 0, y: 0 },
        metadata: { foundry_uuid: 'Actor.a1' },
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user',
      },
      {
        id: 'n2',
        type: 'npc',
        label: 'Bob',
        position: { x: 0, y: 0 },
        metadata: {},
        locked: false,
        hidden: false,
        created_at: Date.now(),
        created_by: 'user',
      },
    ];

    it('matches by UUID first', () => {
      const actors = [{ _id: 'a1', name: 'Wrong Name', type: 'traveller', system: {} }];
      const result = matchActorsToNodes(actors, nodes);
      
      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].nodeId).toBe('n1');
    });

    it('matches by name when UUID not found', () => {
      const actors = [{ _id: 'unknown', name: 'bob', type: 'traveller', system: {} }];
      const result = matchActorsToNodes(actors, nodes);
      
      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].nodeId).toBe('n2');
    });

    it('reports unmatched actors', () => {
      const actors = [{ _id: 'xxx', name: 'Unknown', type: 'traveller', system: {} }];
      const result = matchActorsToNodes(actors, nodes);
      
      expect(result.unmatched).toHaveLength(1);
      expect(result.updated).toBe(0);
    });
  });
});
