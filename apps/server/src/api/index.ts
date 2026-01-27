import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fetchDocumentState } from '../ws/hocuspocus.js';
import { registerKnowledgeRoutes } from '../routes/knowledge.js';
import { registerDocumentRoutes } from '../routes/documents.js';
import { registerFoundryRoutes } from '../routes/foundry.js';
import { registerConflictRoutes } from '../routes/conflicts.js';
import { registerExportRoutes } from '../routes/export.js';

const FASTIFY_PORT = 3002;

export const fastify = Fastify({ logger: true });

export async function startFastify(): Promise<void> {
  await fastify.register(cors, {
    origin: ['http://localhost:3000'],
  });

  await registerKnowledgeRoutes(fastify);
  await registerDocumentRoutes(fastify);
  await registerFoundryRoutes(fastify);
  await registerConflictRoutes(fastify);
  await registerExportRoutes(fastify);

  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  fastify.get<{
    Params: { campaignId: string; docType: string };
  }>('/api/doc/:campaignId/:docType', async (request, reply) => {
    const { campaignId, docType } = request.params;
    const docId = `${campaignId}:${docType}`;

    const state = await fetchDocumentState(docId);

    if (!state) {
      reply.code(404);
      return { error: 'Document not found or empty' };
    }

    reply.header('Content-Type', 'application/octet-stream');
    return Buffer.from(state);
  });

  try {
    await fastify.listen({ port: FASTIFY_PORT, host: '0.0.0.0' });
    console.log(`[Fastify] REST API listening on port ${FASTIFY_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export async function stopFastify(): Promise<void> {
  await fastify.close();
}

export { FASTIFY_PORT };
