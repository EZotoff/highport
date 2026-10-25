import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requirePrincipal } from '../src/lib/principal.js';

const secret = 'principal-test-secret';

function token(overrides: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-a',
      email: 'a@example.test',
      purpose: 'api',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      ...overrides,
    }),
  ).toString('base64url');
  return `${header}.${payload}.${createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')}`;
}

describe('API principal', () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    undefined,
    'garbage',
    token({ exp: 0 }),
    token({ purpose: 'hocuspocus' }),
    token({ sub: '' }),
  ])('rejects a request when its token is missing or invalid (%s)', async (authorization) => {
    // Given
    vi.stubEnv('AUTH_SECRET', secret);
    vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
    const app = Fastify();
    app.get('/', { preHandler: requirePrincipal }, async (request) => request.principal);
    // When
    const response = await app.inject({
      url: '/',
      headers: authorization ? { authorization: `Bearer ${authorization}` } : {},
    });
    // Then
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Authentication required' });
    await app.close();
  });

  it('exposes the signed principal when the API token is valid', async () => {
    // Given
    vi.stubEnv('AUTH_SECRET', secret);
    vi.stubEnv('HOCUSPOCUS_JWT_SECRET', secret);
    const app = Fastify();
    app.get('/', { preHandler: requirePrincipal }, async (request) => request.principal);
    // When
    const response = await app.inject({
      url: '/',
      headers: { authorization: `Bearer ${token()}`, 'x-user-id': 'victim' },
    });
    // Then
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ userId: 'user-a', email: 'a@example.test' });
    await app.close();
  });
});
