import { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { campaigns } from '../db/schema.js';
import { generateCampaignId } from '@highport/shared/utils/id';

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
  fastify.post<{ Body: CreateCampaignBody }>('/api/campaigns', async (request, reply) => {
    const userId = getUserId(request);
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

    await db.insert(campaigns).values({
      id,
      name,
      ownerId: userId,
      createdAt: now,
    });

    const created = { id, name, ownerId: userId, createdAt: now };
    reply.code(201);
    return created;
  });

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
