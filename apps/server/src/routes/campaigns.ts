import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { campaigns, campaignMembers } from '../db/schema.js';
import { generateCampaignId } from '@highport/shared/utils/id';
import { requirePrincipal } from '../lib/principal.js';
import { requireCampaignRole } from '../lib/authz.js';

interface CreateCampaignBody {
  name: string;
}

interface CampaignParams {
  id: string;
}

/** Extract authenticated user ID from X-User-Id header. Returns null if missing. */
function getUserId(request: {
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const header = request.headers['x-user-id'];
  if (Array.isArray(header)) return header[0] || null;
  return header || null;
}

export async function registerCampaignRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/campaigns — List campaigns owned by the authenticated user
  fastify.get('/api/campaigns', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    const results = await db.select().from(campaigns).where(eq(campaigns.ownerId, userId));
    return results;
  });

  // POST /api/campaigns — Create a new campaign (ownerId from auth header)
  fastify.post<{ Body: CreateCampaignBody }>(
    '/api/campaigns',
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const userId = request.principal.userId;
      if (!userId) {
        reply.code(401);
        return { error: 'Authentication required' };
      }

      const { name } = request.body;

      if (!name) {
        reply.code(400);
        return { error: 'name is required' };
      }

      const id = generateCampaignId();
      const now = new Date();

      await db.transaction(async (tx) => {
        await tx.insert(campaigns).values({ id, name, ownerId: userId, createdAt: now });
        await tx.insert(campaignMembers).values({ campaignId: id, userId, role: 'gm' });
      });

      const created = { id, name, ownerId: userId, createdAt: now };
      reply.code(201);
      return created;
    },
  );

  fastify.get<{ Params: CampaignParams }>(
    '/api/campaigns/:id/members',
    { preHandler: requirePrincipal },
    async (request) => {
      await requireCampaignRole(request.params.id, request.principal.userId, ['gm']);
      return db
        .select()
        .from(campaignMembers)
        .where(eq(campaignMembers.campaignId, request.params.id));
    },
  );

  fastify.post<{ Params: CampaignParams; Body: { userId: string; role: 'gm' | 'player' } }>(
    '/api/campaigns/:id/members',
    {
      preHandler: requirePrincipal,
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'role'],
          additionalProperties: false,
          properties: {
            userId: { type: 'string', minLength: 1, maxLength: 64 },
            role: { enum: ['gm', 'player'] },
          },
        },
      },
    },
    async (request, reply) => {
      await requireCampaignRole(request.params.id, request.principal.userId, ['gm']);
      await db
        .insert(campaignMembers)
        .values({ campaignId: request.params.id, ...request.body })
        .onConflictDoNothing();
      return reply.code(201).send({ campaignId: request.params.id, ...request.body });
    },
  );

  // GET /api/campaigns/:id — Get a single campaign (must be owned by user)
  fastify.get<{ Params: CampaignParams }>('/api/campaigns/:id', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    const { id } = request.params;

    const results = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.ownerId, userId)));

    if (results.length === 0) {
      reply.code(404);
      return { error: 'Campaign not found' };
    }

    return results[0];
  });

  // DELETE /api/campaigns/:id — Delete a campaign (must be owned by user, 404 if not)
  fastify.delete<{ Params: CampaignParams }>('/api/campaigns/:id', async (request, reply) => {
    const userId = getUserId(request);
    if (!userId) {
      reply.code(401);
      return { error: 'Authentication required' };
    }

    const { id } = request.params;

    const existing = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.ownerId, userId)));

    if (existing.length === 0) {
      reply.code(404);
      return { error: 'Campaign not found' };
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));
    reply.code(204);
  });
}
