import * as Y from 'yjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { documents } from '../db/schema.js';
import { fetchDocumentState, hocuspocus } from '../ws/hocuspocus.js';
import { AuthorizationError } from './authz.js';

export async function resourceCampaign(id: string, kind: 'node' | 'character'): Promise<string> {
  const docs = await db
    .select({ id: documents.id, campaignId: documents.campaignId })
    .from(documents)
    .where(eq(documents.docType, 'graph'));
  const matches = new Set<string>();
  for (const row of docs) {
    const live = hocuspocus.documents.get(row.id);
    const doc = live ?? new Y.Doc();
    try {
      if (!live) {
        const state = await fetchDocumentState(row.id);
        if (!state) continue;
        Y.applyUpdate(doc, state);
      }
      const characters = doc.getMap('chargen').get('characters');
      const exists =
        kind === 'node'
          ? doc.getMap('nodes').has(id)
          : characters instanceof Y.Map && characters.has(id);
      if (exists) matches.add(row.campaignId);
    } finally {
      if (!live) doc.destroy();
    }
  }
  const [campaignId] = matches;
  if (matches.size !== 1 || !campaignId) throw new AuthorizationError();
  return campaignId;
}
