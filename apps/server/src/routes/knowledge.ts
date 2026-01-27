import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { characterKnowledge } from '../db/schema.js';
import { generateId } from '@planeshift/shared/utils/id';
import { assembleScope } from '../services/scope.js';

interface GrantBody {
  characterId: string;
  knowledgeTag: string;
}

interface CharacterParams {
  characterId: string;
}

export async function registerKnowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: GrantBody }>('/api/knowledge/grant', async (request, reply) => {
    const { characterId, knowledgeTag } = request.body;
    const userId = request.headers['x-user-id'] as string;

    if (!userId) {
      reply.code(401);
      return { error: 'Missing X-User-Id header' };
    }

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
  });

  fastify.get<{ Params: CharacterParams }>('/api/knowledge/:characterId', async (request) => {
    const { characterId } = request.params;

    const grants = await db
      .select()
      .from(characterKnowledge)
      .where(eq(characterKnowledge.characterId, characterId));

    const tags = grants.map((g) => g.knowledgeTag);
    return { tags };
  });

  fastify.get('/api/knowledge/scope', async (request) => {
    const userId = request.headers['x-user-id'] as string;
    const characterId = request.headers['x-character-id'] as string | undefined;
    const isGM = request.headers['x-is-gm'] === 'true';

    if (!userId) {
      return { scope: ['public'] };
    }

    const scope = await assembleScope(userId, characterId || null, isGM);
    return { scope };
  });
}
