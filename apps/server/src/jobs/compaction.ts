import * as Y from 'yjs';
import { eq } from 'drizzle-orm';
import { db, sql } from '../db/client.js';
import { documents, documentUpdates } from '../db/schema.js';
import { logger } from '../lib/logger.js';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const COMPACTION_INTERVAL_MS = FIVE_MINUTES_MS;
const MIN_UPDATES_BEFORE_COMPACTION = 100;

function hashDocIdToInt(docId: string): number {
  let hash = 0;
  for (let i = 0; i < docId.length; i++) {
    const char = docId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function compactDocument(docId: string): Promise<void> {
  const lockId = hashDocIdToInt(docId);

  await sql`SELECT pg_advisory_lock(${lockId})`;

  try {
    const now = new Date();

    const snapshot = await db.query.documents.findFirst({
      where: eq(documents.id, docId),
    });

    const updates = await db.query.documentUpdates.findMany({
      where: eq(documentUpdates.docId, docId),
      orderBy: (updates, { asc }) => [asc(updates.createdAt)],
    });

    if (updates.length === 0) {
      return;
    }

    const yDoc = new Y.Doc();

    if (snapshot?.yjsState) {
      Y.applyUpdate(yDoc, snapshot.yjsState);
    }

    for (const update of updates) {
      Y.applyUpdate(yDoc, update.updateData);
    }

    const mergedState = Y.encodeStateAsUpdate(yDoc);

    await db
      .update(documents)
      .set({ yjsState: mergedState, updatedAt: now })
      .where(eq(documents.id, docId));

    const updateIds = updates.map((u) => u.id);
    for (const updateId of updateIds) {
      await db.delete(documentUpdates).where(eq(documentUpdates.id, updateId));
    }
  } finally {
    await sql`SELECT pg_advisory_unlock(${lockId})`;
  }
}

async function runCompactionCycle(): Promise<void> {
  const docsWithUpdates = await db
    .selectDistinct({ docId: documentUpdates.docId })
    .from(documentUpdates);

  for (const { docId } of docsWithUpdates) {
    const updateCount = await db
      .select({ count: documentUpdates.id })
      .from(documentUpdates)
      .where(eq(documentUpdates.docId, docId));

    if (updateCount.length > MIN_UPDATES_BEFORE_COMPACTION) {
      try {
        await compactDocument(docId);
        logger.info(`[Compaction] Compacted document: ${docId}`);
      } catch (error) {
        logger.error(`[Compaction] Error compacting ${docId}:`, error);
      }
    }
  }
}

let compactionTimer: NodeJS.Timeout | null = null;

export function startCompactionJob(): void {
  if (compactionTimer) {
    return;
  }

  compactionTimer = setInterval(() => {
    runCompactionCycle().catch((err) => {
      logger.error('[Compaction] Cycle error:', err);
    });
  }, COMPACTION_INTERVAL_MS);

  logger.info(`[Compaction] Started job, running every ${COMPACTION_INTERVAL_MS / 1000}s`);
}

export function stopCompactionJob(): void {
  if (compactionTimer) {
    clearInterval(compactionTimer);
    compactionTimer = null;
    logger.info('[Compaction] Stopped job');
  }
}
