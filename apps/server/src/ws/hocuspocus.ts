import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import * as Y from 'yjs';
import { eq } from 'drizzle-orm';
import { generateId } from '@highport/shared';
import { db } from '../db/client.js';
import { campaigns, documents, documentUpdates } from '../db/schema.js';
import { logger } from '../lib/logger.js';

const HOCUSPOCUS_PORT = 18121;
const DEFAULT_CAMPAIGN_ID = 'campaign_default';
const HOCUSPOCUS_JWT_PURPOSE = 'hocuspocus';
const WEB_ENV_AUTH_SECRET_PATHS = ['../web/.env', 'apps/web/.env'] as const;

type HocuspocusJwtHeader = {
  readonly alg: 'HS256';
  readonly typ: 'JWT';
};

type HocuspocusJwtClaims = {
  readonly sub: string;
  readonly email?: string;
  readonly name?: string;
  readonly purpose: typeof HOCUSPOCUS_JWT_PURPOSE;
  readonly iat: number;
  readonly exp: number;
};

class HocuspocusAuthenticationError extends Error {
  constructor() {
    super('Not authorized');
    this.name = 'HocuspocusAuthenticationError';
  }
}

function getHocuspocusJwtSecret(): string {
  const secret =
    process.env.HOCUSPOCUS_JWT_SECRET ?? process.env.AUTH_SECRET ?? readAuthSecretFromWebEnv();
  if (!secret) {
    throw new HocuspocusAuthenticationError();
  }
  return secret;
}

function stripOptionalQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readAuthSecretFromWebEnv(): string | null {
  for (const path of WEB_ENV_AUTH_SECRET_PATHS) {
    if (!existsSync(path)) {
      continue;
    }
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (key === 'AUTH_SECRET') {
        const value = stripOptionalQuotes(valueParts.join('=').trim());
        return value.length > 0 ? value : null;
      }
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHocuspocusJwtHeader(value: unknown): value is HocuspocusJwtHeader {
  if (!isRecord(value)) {
    return false;
  }
  return value['alg'] === 'HS256' && value['typ'] === 'JWT';
}

function isHocuspocusJwtClaims(value: unknown): value is HocuspocusJwtClaims {
  if (!isRecord(value)) {
    return false;
  }
  const email = value['email'];
  const name = value['name'];
  return (
    typeof value['sub'] === 'string' &&
    value['purpose'] === HOCUSPOCUS_JWT_PURPOSE &&
    typeof value['iat'] === 'number' &&
    typeof value['exp'] === 'number' &&
    (email === undefined || typeof email === 'string') &&
    (name === undefined || typeof name === 'string')
  );
}

function parseJwtPart(part: string): unknown {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function verifyHocuspocusJwt(token: string): HocuspocusJwtClaims {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new HocuspocusAuthenticationError();
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new HocuspocusAuthenticationError();
  }

  const header = parseJwtPart(encodedHeader);
  if (!isHocuspocusJwtHeader(header)) {
    throw new HocuspocusAuthenticationError();
  }

  const expectedSignature = createHmac('sha256', getHocuspocusJwtSecret())
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const actualSignature = Buffer.from(encodedSignature, 'base64url');
  if (
    actualSignature.byteLength !== expectedSignature.byteLength ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new HocuspocusAuthenticationError();
  }

  const claims = parseJwtPart(encodedPayload);
  if (!isHocuspocusJwtClaims(claims)) {
    throw new HocuspocusAuthenticationError();
  }

  if (claims.exp <= Math.floor(Date.now() / 1000)) {
    throw new HocuspocusAuthenticationError();
  }

  return claims;
}

async function ensureDocumentExists(docId: string): Promise<void> {
  const parts = docId.split(':');
  const campaignId = parts[0] || DEFAULT_CAMPAIGN_ID;
  const docType = parts[1] || 'unknown';

  await db
    .insert(campaigns)
    .values({
      id: campaignId,
      name: campaignId === DEFAULT_CAMPAIGN_ID ? 'Default Campaign' : 'Unnamed Campaign',
      ownerId: 'system',
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .insert(documents)
    .values({
      id: docId,
      campaignId,
      docType,
      yjsState: null,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}

export async function fetchDocumentState(docId: string): Promise<Uint8Array | null> {
  await ensureDocumentExists(docId);

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
  });

  const updates = await db.query.documentUpdates.findMany({
    where: eq(documentUpdates.docId, docId),
    orderBy: (updates, { asc }) => [asc(updates.createdAt)],
  });

  if (!doc?.yjsState && updates.length === 0) {
    return null;
  }

  const yDoc = new Y.Doc();

  if (doc?.yjsState) {
    Y.applyUpdate(yDoc, doc.yjsState);
  }

  for (const update of updates) {
    Y.applyUpdate(yDoc, update.updateData);
  }

  return Y.encodeStateAsUpdate(yDoc);
}

export const hocuspocus = new Hocuspocus({
  port: HOCUSPOCUS_PORT,

  extensions: [
    new Database({
      async fetch({ documentName }) {
        return fetchDocumentState(documentName);
      },
      async store() {
        // Intentionally empty - we use onChange for incremental updates
        // and compaction job for snapshots
      },
    }),
  ],

  async onRequest({ request, response }) {
    const origin = request.headers.origin;
    if (origin === 'http://localhost:18120') {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  },

  async onChange({ documentName, update }) {
    if (!update) return;

    await ensureDocumentExists(documentName);

    await db.insert(documentUpdates).values({
      id: generateId('update'),
      docId: documentName,
      updateData: update,
      createdAt: new Date(),
    });
  },

  async onAuthenticate({ token }) {
    if (!token) {
      throw new Error('Not authorized');
    }
    const claims = verifyHocuspocusJwt(token);
    return { userId: claims.sub, email: claims.email };
  },

  async onConnect({ documentName }) {
    logger.info(`[Hocuspocus] Client connected to document: ${documentName}`);
  },

  async onDisconnect({ documentName, clientsCount }) {
    logger.info(`[Hocuspocus] Client disconnected from ${documentName}, ${clientsCount} remaining`);
  },

  async onDestroy() {
    logger.info('[Hocuspocus] Server destroyed');
  },
});

export async function startHocuspocus(): Promise<void> {
  await hocuspocus.listen();
  logger.info(`[Hocuspocus] WebSocket server listening on port ${HOCUSPOCUS_PORT}`);
}

export { HOCUSPOCUS_PORT };
