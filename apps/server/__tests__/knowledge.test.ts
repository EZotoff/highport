import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { getTableName } from 'drizzle-orm';
import { characterKnowledge, ingestedDocuments } from '../src/db/schema.js';
import { registerKnowledgeRoutes } from '../src/routes/knowledge.js';
import { registerDocumentRoutes } from '../src/routes/documents.js';
import { bearer, secret } from './api-token.js';
const fixture = vi.hoisted(() => ({ documentExists: true }));

vi.mock('../src/lib/resource-authz.js', () => ({
  resourceCampaign: vi.fn(async () => 'campaign_default'),
}));
vi.mock('../src/lib/authz.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/lib/authz.js')>();
  return {
    ...original,
    getMembership: vi.fn(async () => ({ role: 'gm' })),
    requireCampaignRole: vi.fn(async (_campaign: string, userId: string) => {
      if (userId === 'player') throw new original.AuthorizationError();
    }),
  };
});

vi.mock('../src/db/client.js', () => {
  const mockData: { grants: Record<string, unknown>[]; documents: Record<string, unknown>[] } = {
    grants: [],
    documents: [{ id: 'doc_123', campaignId: 'campaign_default' }],
  };

  return {
    db: {
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn(() => {
            const tableName =
              table === characterKnowledge
                ? getTableName(characterKnowledge)
                : table === ingestedDocuments
                  ? getTableName(ingestedDocuments)
                  : '';
            if (tableName === 'character_knowledge') {
              return Promise.resolve(mockData.grants);
            }
            if (tableName === 'ingested_documents') {
              return Promise.resolve(fixture.documentExists ? mockData.documents : []);
            }
            return Promise.resolve([]);
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
    _mockData: mockData,
  };
});

vi.mock('../src/services/scope.js', () => ({
  assembleScope: vi.fn(async (_userId: string, characterId: string | null, isGM: boolean) => {
    const scope = ['public'];
    if (isGM) scope.push('gm');
    if (characterId) {
      scope.push(`char:${characterId}`);
      scope.push('party');
    }
    return scope;
  }),
}));

describe('Knowledge Routes', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv('AUTH_SECRET', secret);
    vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
    fastify = Fastify();
    await registerKnowledgeRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('POST /api/knowledge/grant', () => {
    it('grants secret knowledge tag successfully', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/knowledge/grant',
        headers: { authorization: bearer('user_123') },
        payload: { characterId: 'char_abc', knowledgeTag: 'secret:lost-city' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('granted');
      expect(data.id).toMatch(/^grant_/);
    });

    it('rejects non-secret tags with 400', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/knowledge/grant',
        headers: { authorization: bearer('user_123') },
        payload: { characterId: 'char_abc', knowledgeTag: 'public' },
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.error).toContain('secret:');
    });

    it('rejects missing token with 401', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/knowledge/grant',
        payload: { characterId: 'char_abc', knowledgeTag: 'secret:test' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/knowledge/:characterId', () => {
    it('returns empty tags for character with no grants', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/char_xyz',
        headers: { authorization: bearer() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ tags: [] });
    });
  });

  describe('GET /api/knowledge/scope', () => {
    it('rejects anonymous scope access', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/scope',
      });

      expect(response.statusCode).toBe(401);
    });

    it('includes gm in scope for a signed GM', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/scope',
        headers: {
          authorization: bearer('user_123'),
        },
      });

      expect(response.statusCode).toBe(200);
      const scope = response.json().scope;
      expect(scope).toContain('public');
      expect(scope).toContain('gm');
    });

    it('includes char scope when character-id is provided', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/scope?characterId=char_abc',
        headers: {
          authorization: bearer('user_123'),
        },
      });

      expect(response.statusCode).toBe(200);
      const scope = response.json().scope;
      expect(scope).toContain('public');
      expect(scope).toContain('char:char_abc');
      expect(scope).toContain('party');
    });
  });
});

describe('Document Routes', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv('AUTH_SECRET', secret);
    vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
    fastify = Fastify();
    await registerDocumentRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    fixture.documentExists = true;
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
  });

  describe('PATCH /api/documents/:sourceId/scope', () => {
    it('rejects non-GM with 403', async () => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/documents/doc_123/scope',
        headers: { authorization: bearer('player') },
        payload: { accessScope: ['public', 'gm'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent document', async () => {
      fixture.documentExists = false;
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/documents/doc_nonexistent/scope',
        headers: { authorization: bearer() },
        payload: { accessScope: ['public', 'gm'] },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/documents/:sourceId', () => {
    it('returns 404 for non-existent document', async () => {
      fixture.documentExists = false;
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/documents/doc_nonexistent',
        headers: { authorization: bearer() },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
