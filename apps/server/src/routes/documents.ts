import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ingestedDocuments } from '../db/schema.js';

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

interface ScopeParams {
  sourceId: string;
}

interface ScopeBody {
  accessScope: string[];
}

export async function registerDocumentRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.patch<{ Params: ScopeParams; Body: ScopeBody }>(
    '/api/documents/:sourceId/scope',
    async (request, reply) => {
      const { sourceId } = request.params;
      const { accessScope } = request.body;
      const isGM = request.headers['x-is-gm'] === 'true';

      if (!isGM) {
        reply.code(403);
        return { error: 'Only GM can modify document scope' };
      }

      const existing = await db
        .select()
        .from(ingestedDocuments)
        .where(eq(ingestedDocuments.id, sourceId));

      if (existing.length === 0) {
        reply.code(404);
        return { error: 'Document not found' };
      }

      await db
        .update(ingestedDocuments)
        .set({ accessScope })
        .where(eq(ingestedDocuments.id, sourceId));

      try {
        await fetch(`${RAG_SERVICE_URL}/update-scope`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: sourceId, access_scope: accessScope }),
        });
      } catch {
        fastify.log.warn(`Failed to update scope in RAG service for ${sourceId}`);
      }

      return { status: 'updated' };
    },
  );

  fastify.get<{ Params: ScopeParams }>('/api/documents/:sourceId', async (request, reply) => {
    const { sourceId } = request.params;

    const docs = await db
      .select()
      .from(ingestedDocuments)
      .where(eq(ingestedDocuments.id, sourceId));

    if (docs.length === 0) {
      reply.code(404);
      return { error: 'Document not found' };
    }

    return docs[0];
  });
}
