import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  campaignMembers,
  campaigns,
  conflictQueue,
  documents,
  ingestedDocuments,
} from '../src/db/schema.js';
import { registerCampaignRoutes } from '../src/routes/campaigns.js';
import { registerDocumentRoutes } from '../src/routes/documents.js';
import { registerConflictRoutes } from '../src/routes/conflicts.js';
import { registerKnowledgeRoutes } from '../src/routes/knowledge.js';
import { registerPortraitRoutes } from '../src/routes/portraits.js';
import { registerExportRoutes } from '../src/routes/export.js';
import { registerDocumentStateRoute } from '../src/api/index.js';
import { bearer, secret } from './api-token.js';

const fixture = vi.hoisted(() => ({ role: 'player' }));
vi.mock('../src/db/client.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(async (condition: SQL) => {
          if (table === campaignMembers) return fixture.role ? [{ role: fixture.role }] : [];
          if (table === campaigns) {
            const { params } = new PgDialect().sqlToQuery(condition);
            return params.length === 1 || params.includes('owner')
              ? [{ id: 'camp', ownerId: 'owner' }]
              : [];
          }
          if (table === ingestedDocuments) return [{ id: 'source', campaignId: 'camp' }];
          if (table === conflictQueue)
            return [{ id: 'conflict', nodeId: 'node', status: 'pending' }];
          if (table === documents) return [{ id: 'camp:graph', campaignId: 'camp' }];
          return [];
        }),
      })),
    })),
    query: {
      portraits: { findFirst: vi.fn(async () => ({ id: 'portrait', campaignId: 'camp' })) },
    },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
  },
}));
vi.mock('../src/ws/hocuspocus.js', () => ({
  hocuspocus: { documents: new Map() },
  fetchDocumentState: vi.fn(async () => {
    const doc = new Y.Doc();
    doc.getMap('nodes').set('node', new Y.Map());
    const chargen = doc.getMap('chargen');
    chargen.set('characters', new Y.Map());
    const characters = chargen.get('characters');
    if (characters instanceof Y.Map) characters.set('character', new Y.Map());
    const state = Y.encodeStateAsUpdate(doc);
    doc.destroy();
    return state;
  }),
}));
vi.mock('../src/services/portrait-service.js', () => ({
  generatePortrait: vi.fn(),
  remixPortrait: vi.fn(),
  searchPortraits: vi.fn(async () => []),
  getPortraitImage: vi.fn(),
  attachPortrait: vi.fn(),
  PortraitUnavailableError: class extends Error {},
}));

let app: FastifyInstance;
beforeAll(async () => {
  vi.stubEnv('AUTH_SECRET', secret);
  vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
  app = Fastify();
  await registerCampaignRoutes(app);
  await registerDocumentRoutes(app);
  await registerConflictRoutes(app);
  await registerKnowledgeRoutes(app);
  await registerPortraitRoutes(app);
  await registerExportRoutes(app);
  await registerDocumentStateRoute(app);
});
beforeEach(() => {
  fixture.role = 'player';
  vi.clearAllMocks();
});
afterAll(async () => {
  await app.close();
  vi.unstubAllEnvs();
});

describe('campaigns authorization', () => {
  it('returns the campaign when the signed user is its owner', async () => {
    const response = await app.inject({
      url: '/api/campaigns/camp',
      headers: { authorization: bearer('owner') },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe('camp');
  });
  it('rejects identity headers when no token is supplied', async () => {
    // Given / When
    const response = await app.inject({ url: '/api/campaigns', headers: { 'X-User-Id': 'owner' } });
    // Then
    expect(response.statusCode).toBe(401);
  });
  it.each(['GET', 'DELETE'] as const)('hides another owner campaign on %s', async (method) => {
    // Given / When
    const response = await app.inject({
      method,
      url: '/api/campaigns/camp',
      headers: { authorization: bearer('outsider') },
    });
    // Then
    expect(response.statusCode).toBe(404);
  });
});

describe('documents authorization', () => {
  it('returns a document when the signed user is a campaign member', async () => {
    const response = await app.inject({
      url: '/api/documents/source',
      headers: { authorization: bearer('player') },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().campaignId).toBe('camp');
  });
  it.each([{}, { 'X-Is-GM': 'true' }])(
    'denies player scope changes even with spoofed headers %j',
    async (headers) => {
      // Given / When
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/documents/source/scope',
        headers: { ...headers, authorization: bearer('player') },
        payload: { accessScope: ['public'] },
      });
      // Then
      expect(response.statusCode).toBe(403);
    },
  );
});

const protectedRoutes = [
  { family: 'conflicts', method: 'GET', url: '/api/conflicts?campaignId=camp' },
  { family: 'conflicts detail', method: 'GET', url: '/api/conflicts/conflict' },
  {
    family: 'conflicts resolve',
    method: 'POST',
    url: '/api/conflicts/conflict/resolve',
    payload: { resolution: 'keep_foundry' },
  },
  { family: 'conflicts dismiss', method: 'DELETE', url: '/api/conflicts/conflict' },
  { family: 'knowledge', method: 'GET', url: '/api/knowledge/scope?campaignId=camp' },
  { family: 'knowledge character', method: 'GET', url: '/api/knowledge/character' },
  {
    family: 'knowledge grant',
    method: 'POST',
    url: '/api/knowledge/grant',
    payload: { characterId: 'character', knowledgeTag: 'secret:test' },
  },
  { family: 'portraits', method: 'GET', url: '/api/portraits/search?campaignId=camp' },
  { family: 'portraits image', method: 'GET', url: '/api/portraits/portrait/image' },
  {
    family: 'portraits generate',
    method: 'POST',
    url: '/api/portraits/generate',
    payload: { campaignId: 'camp', tags: {} },
  },
  {
    family: 'portraits remix',
    method: 'POST',
    url: '/api/portraits/portrait/remix',
    payload: { campaignId: 'camp', promptDelta: 'test' },
  },
  {
    family: 'portraits attach',
    method: 'POST',
    url: '/api/nodes/node/portrait',
    payload: { portraitId: 'portrait' },
  },
  { family: 'export', method: 'GET', url: '/api/export/json?campaignId=camp' },
  { family: 'export actors', method: 'GET', url: '/api/export/actors?campaignId=camp' },
  { family: 'document state', method: 'GET', url: '/api/doc/camp/graph' },
  { family: 'documents read', method: 'GET', url: '/api/documents/source' },
] as const;

for (const { family, ...request } of protectedRoutes) {
  describe(`${family} authorization`, () => {
    it('requires authentication when no token is supplied', async () => {
      // Given / When
      const response = await app.inject(request);
      // Then
      expect(response.statusCode).toBe(401);
    });
    it('denies access when the signed user is not a member', async () => {
      // Given
      fixture.role = '';
      // When
      const response = await app.inject({
        ...request,
        headers: { authorization: bearer('outsider') },
      });
      // Then
      expect(response.statusCode).toBe(403);
    });
  });
}

describe('conflicts spoofing', () => {
  it.each(['POST', 'DELETE'] as const)('ignores forged GM authority on %s', async (method) => {
    // Given / When
    const response = await app.inject({
      method,
      url: `/api/conflicts/conflict${method === 'POST' ? '/resolve' : ''}`,
      headers: { authorization: bearer('player'), 'X-Is-GM': 'true' },
      ...(method === 'POST' ? { payload: { resolution: 'keep_foundry' } } : {}),
    });
    // Then
    expect(response.statusCode).toBe(403);
  });
});
