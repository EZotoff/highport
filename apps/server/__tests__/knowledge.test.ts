import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerKnowledgeRoutes } from '../src/routes/knowledge.js';
import { registerDocumentRoutes } from '../src/routes/documents.js';

function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const tableObj = table as Record<string | symbol, unknown>;
  for (const key of Object.getOwnPropertySymbols(tableObj)) {
    const val = tableObj[key];
    if (val && typeof val === 'object' && 'name' in val) {
      return (val as { name: string }).name;
    }
  }
  if ('_' in tableObj && tableObj._ && typeof tableObj._ === 'object' && 'name' in tableObj._) {
    return (tableObj._ as { name: string }).name;
  }
  return '';
}

vi.mock('../src/db/client.js', () => {
  const mockData: { grants: Record<string, unknown>[]; documents: Record<string, unknown>[] } = {
    grants: [],
    documents: [],
  };

  return {
    db: {
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn(() => {
            const tableName = getTableName(table);
            if (tableName === 'character_knowledge') {
              return Promise.resolve(mockData.grants);
            }
            if (tableName === 'ingested_documents') {
              return Promise.resolve(mockData.documents);
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
        headers: { 'x-user-id': 'user_123' },
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
        headers: { 'x-user-id': 'user_123' },
        payload: { characterId: 'char_abc', knowledgeTag: 'public' },
      });

      expect(response.statusCode).toBe(400);
      const data = response.json();
      expect(data.error).toContain('secret:');
    });

    it('rejects missing user header with 401', async () => {
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
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ tags: [] });
    });
  });

  describe('GET /api/knowledge/scope', () => {
    it('returns public scope for anonymous user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/scope',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().scope).toContain('public');
    });

    it('includes gm in scope when x-is-gm is true', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/knowledge/scope',
        headers: {
          'x-user-id': 'user_123',
          'x-is-gm': 'true',
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
        url: '/api/knowledge/scope',
        headers: {
          'x-user-id': 'user_123',
          'x-character-id': 'char_abc',
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
    fastify = Fastify();
    await registerDocumentRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve(new Response('{}', { status: 200 })));
  });

  describe('PATCH /api/documents/:sourceId/scope', () => {
    it('rejects non-GM with 403', async () => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/documents/doc_123/scope',
        headers: { 'x-is-gm': 'false' },
        payload: { accessScope: ['public', 'gm'] },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent document', async () => {
      const response = await fastify.inject({
        method: 'PATCH',
        url: '/api/documents/doc_nonexistent/scope',
        headers: { 'x-is-gm': 'true' },
        payload: { accessScope: ['public', 'gm'] },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/documents/:sourceId', () => {
    it('returns 404 for non-existent document', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/documents/doc_nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
