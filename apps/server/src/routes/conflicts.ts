import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { conflictQueue } from '../db/schema.js';
import { generateId } from '@highport/shared/utils/id';
import type { ConflictResolution } from '../conflicts/types.js';
import { logger } from '../lib/logger.js';

interface IdParams {
  id: string;
}

interface ResolveBody {
  resolution: ConflictResolution;
  manualValue?: unknown;
}

export async function registerConflictRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/conflicts', async (request, reply) => {
    const isGm = request.headers['x-is-gm'] === 'true';

    if (!isGm) {
      reply.code(403);
      return { error: 'Only GM can view conflicts' };
    }

    const conflicts = await db
      .select()
      .from(conflictQueue)
      .where(eq(conflictQueue.status, 'pending'));

    return {
      conflicts: conflicts.map((c) => ({
        id: c.id,
        nodeId: c.nodeId,
        fieldPath: c.fieldPath,
        foundryValue: c.foundryValue,
        highportValue: c.highportValue,
        foundryTimestamp: c.foundryTimestamp?.toISOString() ?? null,
        highportTimestamp: c.highportTimestamp?.toISOString() ?? null,
        status: c.status,
        createdAt: c.createdAt?.toISOString() ?? null,
      })),
    };
  });

  fastify.get<{ Params: IdParams }>('/api/conflicts/:id', async (request, reply) => {
    const { id } = request.params;

    const [conflict] = await db.select().from(conflictQueue).where(eq(conflictQueue.id, id));

    if (!conflict) {
      reply.code(404);
      return { error: 'Conflict not found' };
    }

    return {
      id: conflict.id,
      nodeId: conflict.nodeId,
      fieldPath: conflict.fieldPath,
      foundryValue: conflict.foundryValue,
      highportValue: conflict.highportValue,
      foundryTimestamp: conflict.foundryTimestamp?.toISOString() ?? null,
      highportTimestamp: conflict.highportTimestamp?.toISOString() ?? null,
      status: conflict.status,
      resolution: conflict.resolution ?? null,
      resolvedBy: conflict.resolvedBy ?? null,
      resolvedAt: conflict.resolvedAt?.toISOString() ?? null,
      createdAt: conflict.createdAt?.toISOString() ?? null,
    };
  });

  fastify.post<{ Params: IdParams; Body: ResolveBody }>(
    '/api/conflicts/:id/resolve',
    async (request, reply) => {
      const isGm = request.headers['x-is-gm'] === 'true';
      const userId = request.headers['x-user-id'] as string;

      if (!isGm) {
        reply.code(403);
        return { error: 'Only GM can resolve conflicts' };
      }

      const { id } = request.params;
      const { resolution, manualValue } = request.body;

      if (!['keep_foundry', 'keep_highport', 'manual'].includes(resolution)) {
        reply.code(400);
        return { error: 'Invalid resolution type' };
      }

      const [existing] = await db.select().from(conflictQueue).where(eq(conflictQueue.id, id));

      if (!existing) {
        reply.code(404);
        return { error: 'Conflict not found' };
      }

      if (existing.status !== 'pending') {
        reply.code(400);
        return { error: 'Conflict already resolved' };
      }

      await db
        .update(conflictQueue)
        .set({
          status: 'resolved',
          resolution,
          resolvedBy: userId,
          resolvedAt: new Date(),
        })
        .where(eq(conflictQueue.id, id));

      const resolvedValue =
        resolution === 'manual'
          ? manualValue
          : resolution === 'keep_foundry'
            ? existing.foundryValue
            : existing.highportValue;

      fastify.log.info(
        `[Conflict] Resolved ${id}: ${resolution} ${existing.fieldPath} → ${JSON.stringify(resolvedValue)}`,
      );

      return {
        status: 'resolved',
        resolution,
        value: resolvedValue,
        nodeId: existing.nodeId,
        fieldPath: existing.fieldPath,
      };
    },
  );

  fastify.delete<{ Params: IdParams }>('/api/conflicts/:id', async (request, reply) => {
    const isGm = request.headers['x-is-gm'] === 'true';
    const userId = request.headers['x-user-id'] as string;

    if (!isGm) {
      reply.code(403);
      return { error: 'Only GM can dismiss conflicts' };
    }

    const { id } = request.params;

    const [existing] = await db.select().from(conflictQueue).where(eq(conflictQueue.id, id));

    if (!existing) {
      reply.code(404);
      return { error: 'Conflict not found' };
    }

    await db
      .update(conflictQueue)
      .set({
        status: 'dismissed',
        resolvedBy: userId,
        resolvedAt: new Date(),
      })
      .where(eq(conflictQueue.id, id));

    fastify.log.info(`[Conflict] Dismissed ${id}: ${existing.fieldPath}`);

    return { status: 'dismissed' };
  });
}

export async function queueConflict(
  nodeId: string,
  fieldPath: string,
  foundryValue: unknown,
  highportValue: unknown,
  foundryTimestamp: Date | null,
  highportTimestamp: Date | null,
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

  logger.info(`[Conflict] Queued ${id}: ${fieldPath}`, {
    foundryValue,
    highportValue,
  });

  return id;
}
