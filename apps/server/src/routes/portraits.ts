import { FastifyInstance } from 'fastify';
import {
  attachPortrait,
  generatePortrait,
  getPortraitImage,
  PortraitUnavailableError,
  remixPortrait,
  searchPortraits,
} from '../services/portrait-service.js';
import type { PortraitTags } from '@highport/shared/types/portrait';

interface PortraitGenerateBody {
  campaignId: string;
  subjectNodeId?: string;
  tags: Partial<PortraitTags>;
  appearanceText?: string;
  promptDelta?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  aspectRatio?: string;
  protected?: boolean;
  sourcePolicy?: 'subject_only' | 'family_only' | 'campaign' | 'public';
  familyGroupId?: string;
}

interface PortraitSearchQuery {
  campaignId: string;
  tags?: string;
  limit?: string;
  excludeProtected?: string;
}

interface PortraitIdParams {
  portraitId: string;
}

interface PortraitRemixBody {
  campaignId: string;
  promptDelta: string;
  tagsPatch?: Partial<PortraitTags>;
  targetNodeId?: string;
  familyGroupId?: string;
  protected?: boolean;
  sourcePolicy?: 'subject_only' | 'family_only' | 'campaign' | 'public';
}

interface NodePortraitParams {
  nodeId: string;
}

interface NodePortraitBody {
  portraitId: string;
}

export async function registerPortraitRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: PortraitGenerateBody }>(
    '/api/portraits/generate',
    async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        reply.code(401);
        return { error: 'Missing X-User-Id header' };
      }

      const { campaignId, tags } = request.body;
      if (!campaignId || !tags) {
        reply.code(400);
        return { error: 'campaignId and tags are required' };
      }

      try {
        const result = await generatePortrait({
          campaignId,
          subjectNodeId: request.body.subjectNodeId,
          tags,
          appearanceText: request.body.appearanceText,
          promptDelta: request.body.promptDelta,
          referenceImageBase64: request.body.referenceImageBase64,
          referenceImageMimeType: request.body.referenceImageMimeType,
          aspectRatio: request.body.aspectRatio,
          protected: request.body.protected,
          sourcePolicy: request.body.sourcePolicy,
          familyGroupId: request.body.familyGroupId,
          userId,
        });

        return result;
      } catch (error) {
        if (error instanceof PortraitUnavailableError) {
          reply.code(503);
          return { error: 'rag_unavailable', message: error.message };
        }
        reply.code(500);
        return {
          error: 'internal_error',
          message: error instanceof Error ? error.message : 'Portrait generation failed',
        };
      }
    },
  );

  fastify.get<{ Params: PortraitIdParams }>(
    '/api/portraits/:portraitId/image',
    async (request, reply) => {
      const { portraitId } = request.params;

      // Generate ETag from portraitId (immutable content per ID)
      const etag = `"${portraitId}"`;

      // Handle If-None-Match for 304 Not Modified
      const clientEtag = request.headers['if-none-match'];
      if (clientEtag === etag) {
        reply.code(304);
        return;
      }

      const result = await getPortraitImage(portraitId);

      if (!result) {
        reply.code(404);
        return { error: 'Portrait not found' };
      }

      // Set caching headers (immutable content)
      reply.header('Content-Type', result.mimeType);
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      reply.header('ETag', etag);

      return result.data;
    },
  );

  fastify.get<{ Querystring: PortraitSearchQuery }>(
    '/api/portraits/search',
    async (request, reply) => {
      const { campaignId, tags, limit, excludeProtected } = request.query;
      if (!campaignId) {
        reply.code(400);
        return { error: 'campaignId is required' };
      }

      let parsedTags: Partial<PortraitTags> | undefined;
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          reply.code(400);
          return { error: 'tags must be valid JSON' };
        }
      }

      const results = await searchPortraits({
        campaignId,
        tags: parsedTags,
        limit: limit ? Number.parseInt(limit, 10) : undefined,
        excludeProtected: excludeProtected === 'true',
      });

      return results;
    },
  );

  fastify.post<{ Params: PortraitIdParams; Body: PortraitRemixBody }>(
    '/api/portraits/:portraitId/remix',
    async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        reply.code(401);
        return { error: 'Missing X-User-Id header' };
      }

      const { portraitId } = request.params;
      const { campaignId, promptDelta } = request.body;
      if (!campaignId || !promptDelta) {
        reply.code(400);
        return { error: 'campaignId and promptDelta are required' };
      }

      try {
        const result = await remixPortrait({
          sourcePortraitId: portraitId,
          campaignId,
          promptDelta,
          tagsPatch: request.body.tagsPatch,
          targetNodeId: request.body.targetNodeId,
          familyGroupId: request.body.familyGroupId,
          protected: request.body.protected,
          sourcePolicy: request.body.sourcePolicy,
          userId,
        });

        return result;
      } catch (error) {
        if (error instanceof PortraitUnavailableError) {
          reply.code(503);
          return { error: 'rag_unavailable', message: error.message };
        }
        reply.code(400);
        return { error: error instanceof Error ? error.message : 'Remix failed' };
      }
    },
  );

  fastify.post<{ Params: NodePortraitParams; Body: NodePortraitBody }>(
    '/api/nodes/:nodeId/portrait',
    async (request, reply) => {
      const userId = request.headers['x-user-id'] as string | undefined;
      if (!userId) {
        reply.code(401);
        return { error: 'Missing X-User-Id header' };
      }

      const { nodeId } = request.params;
      const { portraitId } = request.body;
      if (!portraitId) {
        reply.code(400);
        return { error: 'portraitId is required' };
      }

      await attachPortrait(portraitId, nodeId);
      return { status: 'attached' };
    },
  );
}
