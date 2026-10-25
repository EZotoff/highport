import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type Principal = { readonly userId: string; readonly email?: string };

declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal;
  }
}

export class AuthenticationError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationError';
  }
}

function getSecret(): string {
  const secret = process.env.HOCUSPOCUS_JWT_SECRET ?? process.env.AUTH_SECRET;
  if (secret) return secret;
  for (const path of ['../web/.env', 'apps/web/.env']) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const [key, ...parts] = line.split('=');
      if (key !== 'AUTH_SECRET') continue;
      const value = parts.join('=').trim();
      const unquoted = /^(".*"|'.*')$/.test(value) ? value.slice(1, -1) : value;
      if (unquoted) return unquoted;
    }
  }
  throw new AuthenticationError();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function verifyApiJwt(token: string): Principal {
  const parts = token.split('.');
  const [headerPart, payloadPart, signaturePart] = parts;
  if (parts.length !== 3 || !headerPart || !payloadPart || !signaturePart) {
    throw new AuthenticationError();
  }
  try {
    const header: unknown = JSON.parse(Buffer.from(headerPart, 'base64url').toString());
    if (!isRecord(header) || header['alg'] !== 'HS256' || header['typ'] !== 'JWT') {
      throw new AuthenticationError();
    }
    const expected = createHmac('sha256', getSecret())
      .update(`${headerPart}.${payloadPart}`)
      .digest();
    const actual = Buffer.from(signaturePart, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new AuthenticationError();
    }
    const claims: unknown = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
    if (
      !isRecord(claims) ||
      claims['purpose'] !== 'api' ||
      typeof claims['sub'] !== 'string' ||
      !claims['sub'] ||
      typeof claims['iat'] !== 'number' ||
      !Number.isFinite(claims['iat']) ||
      typeof claims['exp'] !== 'number' ||
      !Number.isFinite(claims['exp']) ||
      claims['exp'] <= Math.floor(Date.now() / 1000) ||
      (claims['email'] !== undefined && typeof claims['email'] !== 'string')
    ) {
      throw new AuthenticationError();
    }
    return {
      userId: claims['sub'],
      ...(typeof claims['email'] === 'string' ? { email: claims['email'] } : {}),
    };
  } catch (error) {
    if (error instanceof SyntaxError) throw new AuthenticationError();
    throw error;
  }
}

export async function requirePrincipal(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    await reply.code(401).send({ error: 'Authentication required' });
    return;
  }
  try {
    request.principal = verifyApiJwt(authorization.slice(7));
  } catch (error) {
    if (!(error instanceof AuthenticationError)) throw error;
    await reply.code(401).send({ error: 'Authentication required' });
  }
}
