import { db } from '../db/client.js';
import { syncState, conflictQueue } from '../db/schema.js';
import { generateId } from '@highport/shared/utils/id';
import { eq, and } from 'drizzle-orm';
import type { IncomingChange, SyncState } from './types.js';

const CONFLICT_WINDOW_MS = 5000;

export function detectConflict(state: SyncState, incoming: IncomingChange): boolean {
  const field = state.fields[incoming.fieldPath];
  if (!field) return false;

  const oppositeLastSync =
    incoming.source === 'foundry' ? field.lastHighportSync : field.lastFoundrySync;

  const lastSync = incoming.source === 'foundry' ? field.lastFoundrySync : field.lastHighportSync;

  return (
    oppositeLastSync > lastSync &&
    Math.abs(incoming.timestamp.getTime() - oppositeLastSync.getTime()) < CONFLICT_WINDOW_MS
  );
}

export function buildSyncStateFromDb(
  rows: Array<{
    nodeId: string;
    foundryUuid: string;
    fieldPath: string;
    currentValue: unknown;
    lastFoundrySync: Date | null;
    lastHighportSync: Date | null;
  }>,
): SyncState | null {
  if (rows.length === 0) return null;

  const first = rows[0];
  const fields: SyncState['fields'] = {};

  for (const row of rows) {
    fields[row.fieldPath] = {
      value: row.currentValue,
      lastFoundrySync: row.lastFoundrySync ?? new Date(0),
      lastHighportSync: row.lastHighportSync ?? new Date(0),
    };
  }

  return {
    nodeId: first.nodeId,
    foundryUuid: first.foundryUuid,
    fields,
  };
}

export async function detectConflictFromDb(
  nodeId: string,
  fieldPath: string,
  incoming: IncomingChange,
): Promise<boolean> {
  const state = await db
    .select()
    .from(syncState)
    .where(and(eq(syncState.nodeId, nodeId), eq(syncState.fieldPath, fieldPath)))
    .limit(1);

  if (!state[0]) return false;

  const lastSync =
    incoming.source === 'foundry' ? state[0].lastFoundrySync : state[0].lastHighportSync;

  const oppositeLastSync =
    incoming.source === 'foundry' ? state[0].lastHighportSync : state[0].lastFoundrySync;

  if (!lastSync || !oppositeLastSync) return false;

  return (
    oppositeLastSync > lastSync &&
    Math.abs(incoming.timestamp.getTime() - oppositeLastSync.getTime()) < CONFLICT_WINDOW_MS
  );
}

export async function createConflict(
  nodeId: string,
  fieldPath: string,
  foundryValue: unknown,
  highportValue: unknown,
  foundryTimestamp: Date,
  highportTimestamp: Date,
): Promise<string> {
  const id = generateId('conflict');
  await db.insert(conflictQueue).values({
    id,
    nodeId,
    fieldPath,
    foundryValue,
    highportValue,
    foundryTimestamp,
    highportTimestamp,
    status: 'pending',
  });
  return id;
}

export async function updateSyncState(
  nodeId: string,
  foundryUuid: string,
  fieldPath: string,
  value: unknown,
  source: 'foundry' | 'highport',
): Promise<void> {
  const id = generateId('sync');
  const now = new Date();

  await db
    .insert(syncState)
    .values({
      id,
      nodeId,
      foundryUuid,
      fieldPath,
      currentValue: value,
      lastFoundrySync: source === 'foundry' ? now : null,
      lastHighportSync: source === 'highport' ? now : null,
    })
    .onConflictDoUpdate({
      target: [syncState.nodeId, syncState.fieldPath],
      set: {
        currentValue: value,
        ...(source === 'foundry' ? { lastFoundrySync: now } : { lastHighportSync: now }),
      },
    });
}
