import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';

describe('Fastify Server', () => {
  const fastify = Fastify();

  beforeAll(async () => {
    await fastify.register(cors, {
      origin: ['http://localhost:3010'],
    });

    fastify.get('/health', async () => {
      return { status: 'ok' };
    });

    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });

    it('returns correct content-type', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});

describe('Hocuspocus Server', () => {
  it('exports hocuspocus instance', async () => {
    const { hocuspocus } = await import('../src/ws/hocuspocus.js');
    expect(hocuspocus).toBeDefined();
  });

  it('exports HOCUSPOCUS_PORT constant', async () => {
    const { HOCUSPOCUS_PORT } = await import('../src/ws/hocuspocus.js');
    expect(HOCUSPOCUS_PORT).toBe(3011);
  });
});
