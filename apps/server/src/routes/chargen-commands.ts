import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import * as Y from 'yjs';
import { generateId } from '@highport/shared';
import { db } from '../db/client.js';
import { campaignMembers, campaigns, documentUpdates } from '../db/schema.js';
import { getMembership, requireCampaignRole, AuthorizationError } from '../lib/authz.js';
import { requirePrincipal } from '../lib/principal.js';
import { ensureDocumentExists, hocuspocus } from '../ws/hocuspocus.js';
import {
  acceptLink,
  characterFor,
  CommandError,
  createLinkEdge,
  removeLinkEdge,
  map,
  record,
  resolveDraft,
  sessionFor,
} from '../services/chargen-command.js';
import type { DraftResolution } from '../services/chargen-command.js';

type Params = {
  campaignId: string;
  sessionId: string;
  characterId: string;
  proposalId: string;
  linkId: string;
};

async function applyCommand(params: Params, mutate: (doc: Y.Doc) => void): Promise<void> {
  const name = `${params.campaignId}:graph`;
  if (!(await ensureDocumentExists(name))) throw new CommandError(404, 'Campaign not found');
  const connection = await hocuspocus.openDirectConnection(name);
  let pending: PromiseLike<unknown> | undefined;
  try {
    await connection.transact((document) => {
      sessionFor(document, params.sessionId);
      const vector = Y.encodeStateVector(document);
      document.transact(() => mutate(document), 'server-command');
      const update = Y.encodeStateAsUpdate(document, vector);
      pending = db.insert(documentUpdates).values({
        id: generateId('update'),
        docId: name,
        updateData: update,
        createdAt: new Date(),
      });
    }, 'server-command');
    await pending;
  } finally {
    await connection.disconnect();
  }
}

export async function registerChargenCommandRoutes(app: FastifyInstance): Promise<void> {
  const base = '/api/chargen/:campaignId/:sessionId';
  app.delete<{ Params: Params }>(
    `${base}/characters/:characterId`,
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const { campaignId, characterId } = request.params;
      const member = await getMembership(campaignId, request.principal.userId);
      if (!member) throw new AuthorizationError();
      await applyCommand(request.params, (doc) => {
        const character = characterFor(doc, characterId);
        if (member.role !== 'gm' && character.get('playerId') !== request.principal.userId)
          throw new AuthorizationError();
        map(doc.getMap('chargen').get('characters')).delete(characterId);
      });
      return reply.code(204).send();
    },
  );

  app.post<{ Params: Params; Body: DraftResolution }>(
    `${base}/drafts/:proposalId/resolve`,
    {
      preHandler: requirePrincipal,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['characterId', 'termNumber', 'fieldPath', 'decision'],
          properties: {
            characterId: { type: 'string', minLength: 1 },
            termNumber: { type: 'integer', minimum: 1 },
            fieldPath: { enum: ['eventDescription', 'mishapDescription'] },
            decision: { enum: ['accepted', 'rejected', 'edited'] },
            edits: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      await requireCampaignRole(request.params.campaignId, request.principal.userId, ['gm']);
      if (request.body.decision === 'edited' && request.body.edits === undefined)
        throw new CommandError(400, 'edits required');
      await applyCommand(request.params, (doc) =>
        resolveDraft(doc, request.body, request.principal.userId),
      );
      return { success: true };
    },
  );

  app.post<{ Params: Params }>(
    `${base}/links/:linkId/accept`,
    { preHandler: requirePrincipal },
    async (request) => {
      await requireCampaignRole(request.params.campaignId, request.principal.userId, [
        'gm',
        'player',
      ]);
      await applyCommand(request.params, (doc) =>
        acceptLink(doc, request.params.linkId, request.principal.userId),
      );
      return { success: true };
    },
  );

  app.post<{ Params: Params; Body: { accepted: boolean; description?: string } }>(
    `${base}/links/:linkId/resolve`,
    {
      preHandler: requirePrincipal,
      schema: {
        body: {
          type: 'object',
          required: ['accepted'],
          additionalProperties: false,
          properties: { accepted: { type: 'boolean' }, description: { type: 'string' } },
        },
      },
    },
    async (request) => {
      await requireCampaignRole(request.params.campaignId, request.principal.userId, ['gm']);
      await applyCommand(request.params, (doc) => {
        const link = map(
          map(doc.getMap('chargen').get('crossCharacterLinks')).get(request.params.linkId),
        );
        const status = request.body.accepted ? 'accepted' : 'rejected';
        link.set('resolution', { status, by: 'gm' });
        link.set('status', status);
        link.set('by', request.principal.userId);
        if (request.body.description !== undefined)
          link.set('description', request.body.description);
        if (request.body.accepted) createLinkEdge(doc, request.params.linkId, link);
        else removeLinkEdge(doc, link);
      });
      return { success: true };
    },
  );

  app.post<{ Params: Params; Body: Record<string, unknown> }>(
    `${base}/session/settings`,
    {
      preHandler: requirePrincipal,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            allowedCareers: { type: 'array', items: { type: 'string' } },
            aiVerbosity: { enum: ['brief', 'inspiration', 'full'] },
            isLocked: { type: 'boolean' },
            gmApprovalMode: { enum: ['moderate', 'strict', 'lenient'] },
            crossCharacterLinkMode: { enum: ['gm-mediated', 'player-to-player'] },
          },
        },
      },
    },
    async (request) => {
      await requireCampaignRole(request.params.campaignId, request.principal.userId, ['gm']);
      await applyCommand(request.params, (doc) => {
        const session = sessionFor(doc, request.params.sessionId);
        const current: unknown = session.get('settings');
        session.set('settings', { ...(record(current) ? current : {}), ...request.body });
        session.set('updatedBy', request.principal.userId);
      });
      return { success: true };
    },
  );

  app.post<{ Params: { sessionId: string } }>(
    '/api/chargen/sessions/:sessionId/provision',
    { preHandler: requirePrincipal },
    async (request, reply) => {
      const { sessionId } = request.params;
      if (sessionId.includes(':') || sessionId.length > 64) {
        reply.code(400);
        return { error: 'Invalid session id' };
      }
      const userId = request.principal.userId;
      const [existing] = await db.select().from(campaigns).where(eq(campaigns.id, sessionId));
      if (!existing) {
        await db
          .insert(campaigns)
          .values({
            id: sessionId,
            name: 'Chargen Session',
            ownerId: userId,
            createdAt: new Date(),
          })
          .onConflictDoNothing();
        await db
          .insert(campaignMembers)
          .values({ campaignId: sessionId, userId, role: 'gm' })
          .onConflictDoNothing();
        return { campaignId: sessionId, role: 'gm' };
      }
      const member = await getMembership(sessionId, userId);
      if (member) return { campaignId: sessionId, role: member.role };
      await db
        .insert(campaignMembers)
        .values({ campaignId: sessionId, userId, role: 'player' })
        .onConflictDoNothing();
      return { campaignId: sessionId, role: 'player' };
    },
  );
}
