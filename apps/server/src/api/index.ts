import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fetchDocumentState } from '../ws/hocuspocus.js';
import { registerKnowledgeRoutes } from '../routes/knowledge.js';
import { registerDocumentRoutes } from '../routes/documents.js';
import { registerConflictRoutes } from '../routes/conflicts.js';
import { registerExportRoutes } from '../routes/export.js';
import { registerCampaignRoutes } from '../routes/campaigns.js';
import { registerAuthRoutes } from '../routes/auth.js';
import { registerPortraitRoutes } from '../routes/portraits.js';

const FASTIFY_PORT = 18122;

export const fastify = Fastify({ logger: true });

export async function startFastify(): Promise<void> {
  await fastify.register(cors, {
    origin: ['http://localhost:18120'],
  });

  await registerKnowledgeRoutes(fastify);
  await registerDocumentRoutes(fastify);
  await registerConflictRoutes(fastify);
  await registerExportRoutes(fastify);
  await registerCampaignRoutes(fastify);
  await registerAuthRoutes(fastify);
  await registerPortraitRoutes(fastify);

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
    fastify.log.info(`[Fastify] REST API listening on port ${FASTIFY_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export async function stopFastify(): Promise<void> {
  await fastify.close();
}

export { FASTIFY_PORT };
