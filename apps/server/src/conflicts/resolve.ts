import { db } from '../db/client.js';
import { conflictQueue } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { ConflictResolution, ConflictItem, ConflictContext, Resolution } from './types.js';

const STAT_FIELDS = [
  'hp.current',
  'hp.max',
  'characteristics.str',
  'characteristics.dex',
  'characteristics.end',
  'characteristics.int',
  'characteristics.edu',
  'characteristics.soc',
  'credits',
];

const TEXT_FIELDS = ['notes', 'description', 'biography'];

function isStatField(fieldPath: string): boolean {
  return STAT_FIELDS.some((stat) => fieldPath === stat || fieldPath.startsWith(`${stat}.`));
}

function isTextField(fieldPath: string): boolean {
  return TEXT_FIELDS.some((text) => fieldPath === text || fieldPath.startsWith(`${text}.`));
}

export function resolveConflict(ctx: ConflictContext): Resolution {
  if (ctx.isGmEdit) {
    return ctx.source === 'foundry' ? 'keep_foundry' : 'keep_highport';
  }

  if (isStatField(ctx.fieldPath) && ctx.source === 'foundry') {
    return 'keep_foundry';
  }

  if (isTextField(ctx.fieldPath)) {
    return 'queue';
  }

  return 'lww';
}

export function applyResolution(
  resolution: Resolution,
  ctx: ConflictContext,
): { value: unknown; source: 'foundry' | 'highport' } {
  switch (resolution) {
    case 'keep_foundry':
      return {
        value: ctx.source === 'foundry' ? ctx.incomingValue : ctx.serverValue,
        source: 'foundry',
      };

    case 'keep_highport':
      return {
        value: ctx.source === 'highport' ? ctx.incomingValue : ctx.serverValue,
        source: 'highport',
      };

    case 'lww': {
      if (ctx.incomingTimestamp >= ctx.serverTimestamp) {
        return { value: ctx.incomingValue, source: ctx.source };
      }
      return {
        value: ctx.serverValue,
        source: ctx.source === 'foundry' ? 'highport' : 'foundry',
      };
    }

    case 'queue':
    case 'manual':
      return { value: ctx.serverValue, source: 'highport' };

    default:
      return { value: ctx.incomingValue, source: ctx.source };
  }
}

export function shouldQueueConflict(resolution: Resolution): boolean {
  return resolution === 'queue';
}

export async function resolveConflictInDb(
  conflictId: string,
  resolution: ConflictResolution,
  resolvedBy: string,
): Promise<void> {
  await db
    .update(conflictQueue)
    .set({
      status: 'resolved',
      resolution,
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(eq(conflictQueue.id, conflictId));

  console.log(`[Conflict] Resolved ${conflictId}: ${resolution} by ${resolvedBy}`);
}

export async function dismissConflict(conflictId: string, resolvedBy: string): Promise<void> {
  await db
    .update(conflictQueue)
    .set({
      status: 'dismissed',
      resolvedBy,
      resolvedAt: new Date(),
    })
    .where(eq(conflictQueue.id, conflictId));
}

export async function getPendingConflicts(): Promise<ConflictItem[]> {
  const results = await db.select().from(conflictQueue).where(eq(conflictQueue.status, 'pending'));

  return results.map((r) => ({
    id: r.id,
    nodeId: r.nodeId,
    fieldPath: r.fieldPath,
    foundryValue: r.foundryValue,
    highportValue: r.highportValue,
    foundryTimestamp: r.foundryTimestamp!,
    highportTimestamp: r.highportTimestamp!,
    status: r.status as 'pending',
    resolution: r.resolution as ConflictResolution | undefined,
    resolvedBy: r.resolvedBy ?? undefined,
    resolvedAt: r.resolvedAt ?? undefined,
    createdAt: r.createdAt!,
  }));
}

export async function getConflictById(id: string): Promise<ConflictItem | null> {
  const results = await db.select().from(conflictQueue).where(eq(conflictQueue.id, id)).limit(1);

  if (!results[0]) return null;

  const r = results[0];
  return {
    id: r.id,
    nodeId: r.nodeId,
    fieldPath: r.fieldPath,
    foundryValue: r.foundryValue,
    highportValue: r.highportValue,
    foundryTimestamp: r.foundryTimestamp!,
    highportTimestamp: r.highportTimestamp!,
    status: r.status as 'pending' | 'resolved' | 'dismissed',
    resolution: r.resolution as ConflictResolution | undefined,
    resolvedBy: r.resolvedBy ?? undefined,
    resolvedAt: r.resolvedAt ?? undefined,
    createdAt: r.createdAt!,
  };
}
