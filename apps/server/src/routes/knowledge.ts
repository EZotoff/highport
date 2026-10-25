import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { characterKnowledge } from '../db/schema.js';
import { generateId } from '@highport/shared/utils/id';
import { assembleScope } from '../services/scope.js';
import { requirePrincipal } from '../lib/principal.js';
import { requireCampaignRole, getMembership, AuthorizationError } from '../lib/authz.js';
import { resourceCampaign } from '../lib/resource-authz.js';

interface GrantBody {
  characterId: string;
  knowledgeTag: string;
}

interface CharacterParams {
  characterId: string;
}

export async function registerKnowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: GrantBody }>(
    '/api/knowledge/grant',
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const { characterId, knowledgeTag } = request.body;
      const userId = request.principal.userId;
      await requireCampaignRole(await resourceCampaign(characterId, 'character'), userId, ['gm']);

      if (!knowledgeTag.startsWith('secret:')) {
        reply.code(400);
        return { error: 'Only secret:* tags can be granted' };
      }

      const id = generateId('grant');
      await db.insert(characterKnowledge).values({
        id,
        characterId,
        knowledgeTag,
        grantedBy: userId,
      });

      return { id, status: 'granted' };
    },
  );

  fastify.get<{ Params: CharacterParams }>(
    '/api/knowledge/:characterId',
    { preHandler: requirePrincipal },
    async (request) => {
      const { characterId } = request.params;
      await requireCampaignRole(
        await resourceCampaign(characterId, 'character'),
        request.principal.userId,
        ['gm'],
      );

      const grants = await db
        .select()
        .from(characterKnowledge)
        .where(eq(characterKnowledge.characterId, characterId));

      const tags = grants.map((g) => g.knowledgeTag);
      return { tags };
    },
  );

  fastify.get<{ Querystring: { campaignId?: string; characterId?: string } }>(
    '/api/knowledge/scope',
    { preHandler: requirePrincipal },
    async (request) => {
      const userId = request.principal.userId;
      const { campaignId = 'campaign_default', characterId } = request.query;
      const member = await getMembership(campaignId, userId);
      if (!member) throw new AuthorizationError();
      const isGM = member.role === 'gm';
      if (characterId) {
        if (!isGM || (await resourceCampaign(characterId, 'character')) !== campaignId)
          throw new AuthorizationError();
      }

      const scope = await assembleScope(userId, characterId || null, isGM);
      return { scope };
    },
  );
}
