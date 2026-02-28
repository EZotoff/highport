import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { campaigns } from '../db/schema.js';
import { generateCampaignId } from '@highport/shared/utils/id';

interface CreateCampaignBody {
  name: string;
  ownerId: string;
}

interface CampaignParams {
  id: string;
}

interface CampaignListQuery {
  ownerId?: string;
}

export async function registerCampaignRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/campaigns — List all campaigns, optionally filter by ownerId
  fastify.get<{ Querystring: CampaignListQuery }>('/api/campaigns', async (request) => {
    const { ownerId } = request.query;

    if (ownerId) {
      const results = await db.select().from(campaigns).where(eq(campaigns.ownerId, ownerId));
      return results;
    }

    const results = await db.select().from(campaigns);
    return results;
  });

  // POST /api/campaigns — Create a new campaign
  fastify.post<{ Body: CreateCampaignBody }>('/api/campaigns', async (request, reply) => {
    const { name, ownerId } = request.body;

    if (!name || !ownerId) {
      reply.code(400);
      return { error: 'name and ownerId are required' };
    }

    const id = generateCampaignId();
    const now = new Date();

    await db.insert(campaigns).values({
      id,
      name,
      ownerId,
      createdAt: now,
    });

    const created = { id, name, ownerId, createdAt: now };
    reply.code(201);
    return created;
  });

  // GET /api/campaigns/:id — Get a single campaign
  fastify.get<{ Params: CampaignParams }>('/api/campaigns/:id', async (request, reply) => {
    const { id } = request.params;

    const results = await db.select().from(campaigns).where(eq(campaigns.id, id));

    if (results.length === 0) {
      reply.code(404);
      return { error: 'Campaign not found' };
    }

    return results[0];
  });

  // DELETE /api/campaigns/:id — Delete a campaign
  fastify.delete<{ Params: CampaignParams }>('/api/campaigns/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await db.select().from(campaigns).where(eq(campaigns.id, id));

    if (existing.length === 0) {
      reply.code(404);
      return { error: 'Campaign not found' };
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));
    reply.code(204);
  });
}
