import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerExportRoutes } from '../src/routes/export.js';

vi.mock('../src/ws/hocuspocus.js', () => ({
  fetchDocumentState: vi.fn(() => Promise.resolve(null)),
}));

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

  describe('GET /api/export/actors', () => {
    it('returns an empty actors array by default', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/export/actors',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.actors).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns JSON content type', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/export/actors',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
