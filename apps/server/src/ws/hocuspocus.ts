import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import * as Y from 'yjs';
import { eq } from 'drizzle-orm';
import { generateId } from '@highport/shared';
import { db } from '../db/client.js';
import { campaigns, documents, documentUpdates } from '../db/schema.js';

const HOCUSPOCUS_PORT = 3011;
const DEFAULT_CAMPAIGN_ID = 'campaign_default';

async function ensureDocumentExists(docId: string): Promise<void> {
  const parts = docId.split(':');
  const campaignId = parts[0] || DEFAULT_CAMPAIGN_ID;
  const docType = parts[1] || 'unknown';

  await db.insert(campaigns)
    .values({
      id: campaignId,
      name: campaignId === DEFAULT_CAMPAIGN_ID ? 'Default Campaign' : 'Unnamed Campaign',
      ownerId: 'system',
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  await db.insert(documents)
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
    if (origin === 'http://localhost:3010') {
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

  async onConnect({ documentName }) {
    console.log(`[Hocuspocus] Client connected to document: ${documentName}`);
  },

  async onDisconnect({ documentName, clientsCount }) {
    console.log(`[Hocuspocus] Client disconnected from ${documentName}, ${clientsCount} remaining`);
  },

  async onDestroy() {
    console.log('[Hocuspocus] Server destroyed');
  },
});

export async function startHocuspocus(): Promise<void> {
  await hocuspocus.listen();
  console.log(`[Hocuspocus] WebSocket server listening on port ${HOCUSPOCUS_PORT}`);
}

export { HOCUSPOCUS_PORT };
