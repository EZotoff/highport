import Fastify from 'fastify';
import { afterEach, expect, it, vi } from 'vitest';
import { registerDocumentRoutes } from '../src/routes/documents.js';
import { PortraitService, PortraitUnavailableError } from '../src/services/portrait-service.js';
import { bearer, secret } from './api-token.js';

vi.mock('../src/db/client.js', () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => [{ id: 'source', campaignId: 'camp' }] }) }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  },
}));
vi.mock('../src/lib/authz.js', () => ({ requireCampaignRole: vi.fn(async () => undefined) }));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('sends the service credential after authorizing a scope update', async () => {
  // Given an authenticated game API caller and a configured service credential.
  vi.stubEnv('AUTH_SECRET', secret);
  vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
  vi.stubEnv('RAG_SERVICE_SECRET', 'server-only-secret');
  const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  const app = Fastify();
  await registerDocumentRoutes(app);
  try {
    // When the scope command reaches the downstream RAG service.
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/documents/source/scope',
      headers: { authorization: bearer('gm') },
      payload: { accessScope: ['gm'] },
    });
    // Then RAG receives a service capability, never an asserted user or role.
    expect(response.statusCode).toBe(200);
    const headers = new Headers(request.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-RAG-Service-Secret')).toBe('server-only-secret');
    expect(headers.has('X-User-Id')).toBe(false);
    expect(headers.has('X-Is-GM')).toBe(false);
  } finally {
    await app.close();
  }
});

it('authenticates both portrait tag extraction and image generation', async () => {
  // Given a trusted game API operation and two downstream RAG calls.
  vi.stubEnv('RAG_SERVICE_SECRET', 'server-only-secret');
  const request = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response('{"tags":{"story":{"entity_type":"npc"}}}'))
    .mockResolvedValueOnce(new Response('{}', { status: 503 }));
  // When portrait generation requests tags and an image (unavailable in this fixture).
  await expect(
    new PortraitService().generatePortrait({
      campaignId: 'camp',
      userId: 'signed-user',
      appearanceText: 'A scout',
      tags: { story: { entity_type: 'npc' } },
    }),
  ).rejects.toBeInstanceOf(PortraitUnavailableError);
  // Then both requests carry only the server-held authentication capability.
  expect(request).toHaveBeenCalledTimes(2);
  for (const [, init] of request.mock.calls) {
    const headers = new Headers(init?.headers);
    expect(headers.get('X-RAG-Service-Secret')).toBe('server-only-secret');
    expect(headers.has('X-User-Id')).toBe(false);
    expect(headers.has('X-Is-GM')).toBe(false);
  }
});
