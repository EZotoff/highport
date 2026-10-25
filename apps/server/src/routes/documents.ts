import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ingestedDocuments } from '../db/schema.js';
import { requirePrincipal } from '../lib/principal.js';
import { requireCampaignRole } from '../lib/authz.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:18124';

interface ScopeParams {
  sourceId: string;
}

interface ScopeBody {
  accessScope: string[];
}

export async function registerDocumentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.patch<{ Params: ScopeParams; Body: ScopeBody }>(
    '/api/documents/:sourceId/scope',
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const { sourceId } = request.params;
      const { accessScope } = request.body;

      const existing = await db
        .select()
        .from(ingestedDocuments)
        .where(eq(ingestedDocuments.id, sourceId));

      if (existing.length === 0) {
        reply.code(404);
        return { error: 'Document not found' };
      }
      await requireCampaignRole(existing[0].campaignId, request.principal.userId, ['gm']);

      await db
        .update(ingestedDocuments)
        .set({ accessScope })
        .where(eq(ingestedDocuments.id, sourceId));

      try {
        await fetch(`${RAG_SERVICE_URL}/update-scope`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RAG-Service-Secret': process.env.RAG_SERVICE_SECRET ?? '',
          },
          body: JSON.stringify({ source_id: sourceId, access_scope: accessScope }),
        });
      } catch {
        fastify.log.warn(`Failed to update scope in RAG service for ${sourceId}`);
      }

      return { status: 'updated' };
    },
  );

  fastify.get<{ Params: ScopeParams }>(
    '/api/documents/:sourceId',
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const { sourceId } = request.params;

      const docs = await db
        .select()
        .from(ingestedDocuments)
        .where(eq(ingestedDocuments.id, sourceId));

      if (docs.length === 0) {
        reply.code(404);
        return { error: 'Document not found' };
      }

      await requireCampaignRole(docs[0].campaignId, request.principal.userId, ['gm', 'player']);
      return docs[0];
    },
  );
}
