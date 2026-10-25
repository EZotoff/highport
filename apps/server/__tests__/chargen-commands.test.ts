import { createHmac } from 'node:crypto';
import Fastify from 'fastify';
import * as Y from 'yjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerChargenCommandRoutes } from '../src/routes/chargen-commands.js';
import { campaigns } from '../src/db/schema.js';
import {
  acceptLink,
  crossLinkEdgeId,
  map,
  removeLinkEdge,
} from '../src/services/chargen-command.js';

const mocks = vi.hoisted(() => ({
  members: vi.fn(),
  campaign: vi.fn(),
  insert: vi.fn(),
  connect: vi.fn(),
}));
vi.mock('../src/db/client.js', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: table === campaigns ? mocks.campaign : mocks.members,
      }),
    }),
    insert: () => ({
      values: (row: unknown) => {
        const pending = mocks.insert(row);
        return Object.assign(pending, { onConflictDoNothing: () => pending });
      },
    }),
  },
}));
vi.mock('../src/ws/hocuspocus.js', () => ({
  ensureDocumentExists: async () => true,
  hocuspocus: { openDirectConnection: mocks.connect },
}));

function bearer(userId: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      sub: userId,
      purpose: 'api',
      iat: 1,
      exp: Math.floor(Date.now() / 1000) + 60,
    }),
  ).toString('base64url');
  return `Bearer ${header}.${body}.${createHmac('sha256', 'commands-test-secret').update(`${header}.${body}`).digest('base64url')}`;
}

function fixture(): Y.Doc {
  const doc = new Y.Doc();
  const root = doc.getMap('chargen');
  const session = new Y.Map<unknown>();
  root.set('session', session);
  session.set('id', 'session');
  const characters = new Y.Map<unknown>();
  root.set('characters', characters);
  for (const [id, owner] of [
    ['char-a', 'player-a'],
    ['char-b', 'player-b'],
  ]) {
    const character = new Y.Map<unknown>();
    characters.set(id, character);
    character.set('playerId', owner);
    character.set('terms', [
      {
        termNumber: 1,
        eventDescription: { value: 'draft', status: 'draft', source: 'ai', pendingReviewBy: 'gm' },
      },
    ]);
  }
  const links = new Y.Map<unknown>();
  root.set('crossCharacterLinks', links);
  const link = new Y.Map<unknown>();
  links.set('link', link);
  link.set('sourceCharId', 'char-a');
  link.set('targetCharId', 'char-b');
  link.set('acceptedBy', new Y.Map());
  return doc;
}

describe('chargen command authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['HOCUSPOCUS_JWT_SECRET'] = 'commands-test-secret';
    mocks.insert.mockResolvedValue(undefined);
  });

  const resolution = {
    characterId: 'char-a',
    termNumber: 1,
    fieldPath: 'eventDescription',
    decision: 'accepted',
  };
  const resolveUrl = '/api/chargen/camp/session/drafts/draft/resolve';

  it('preserves GM rejection and repairs accepted edges through the authorized accept service', () => {
    // Given
    const doc = fixture();
    const link = map(map(doc.getMap('chargen').get('crossCharacterLinks')).get('link'));
    link.set('relationship', 'Rival');
    for (const [nodeId, characterId] of [
      ['node-a', 'char-a'],
      ['node-b', 'char-b'],
    ]) {
      const node = new Y.Map<unknown>();
      doc.getMap('nodes').set(nodeId, node);
      node.set('metadata', { chargenId: characterId });
    }
    // When / Then
    doc.transact(() => {
      acceptLink(doc, 'link', 'player-a');
      acceptLink(doc, 'link', 'player-b');
    });
    const id = crossLinkEdgeId('node-a', 'node-b', 'Rival');
    expect(id).toBe(crossLinkEdgeId('node-b', 'node-a', 'Rival'));
    expect(doc.getMap('edges').has(id)).toBe(true);
    doc.transact(() => {
      link.set('resolution', { status: 'rejected', by: 'gm' });
      removeLinkEdge(doc, link);
      acceptLink(doc, 'link', 'player-a');
    });
    expect(link.get('status')).toBe('rejected');
    expect(doc.getMap('edges').size).toBe(0);
    doc.destroy();
  });

  it('rejects resolution when no token is supplied', async () => {
    // Given
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({ method: 'POST', url: resolveUrl, payload: resolution });
    // Then
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('rejects GM-only resolution when a player supplies a valid token', async () => {
    // Given
    mocks.members.mockResolvedValue([{ role: 'player' }]);
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: resolveUrl,
      payload: resolution,
      headers: { authorization: bearer('player-a') },
    });
    // Then
    expect(response.statusCode).toBe(403);
    expect(mocks.connect).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([
    ['DELETE', '/api/chargen/camp/session/characters/char-b', 'player-a'],
    ['POST', '/api/chargen/camp/session/links/link/accept', 'outsider'],
  ] as const)(
    'rejects %s %s when the signed player does not own the resource',
    async (method, url, userId) => {
      // Given
      mocks.members.mockResolvedValue([{ role: 'player' }]);
      const live = fixture();
      mocks.connect.mockResolvedValue({
        transact: async (mutate: (doc: Y.Doc) => void) => mutate(live),
        disconnect: async () => undefined,
      });
      const app = Fastify();
      await registerChargenCommandRoutes(app);
      // When
      const response = await app.inject({
        method,
        url,
        headers: { authorization: bearer(userId) },
      });
      // Then
      expect(response.statusCode).toBe(403);
      expect(mocks.insert).not.toHaveBeenCalled();
      live.destroy();
      await app.close();
    },
  );

  it('persists signed reviewer attribution and updates the live document when a GM resolves a draft', async () => {
    // Given
    mocks.members.mockResolvedValue([{ role: 'gm' }]);
    const live = fixture();
    const persisted = new Y.Doc();
    persisted.getMap('chargen');
    Y.applyUpdate(persisted, Y.encodeStateAsUpdate(live));
    mocks.connect.mockResolvedValue({
      transact: async (mutate: (doc: Y.Doc) => void) => mutate(live),
      disconnect: async () => undefined,
    });
    mocks.insert.mockImplementation(async (row: { updateData: Uint8Array }) => {
      Y.applyUpdate(persisted, row.updateData);
    });
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: resolveUrl,
      payload: resolution,
      headers: { authorization: bearer('gm-signed'), 'x-user-id': 'forged' },
    });
    // Then
    expect(response.statusCode).toBe(200);
    expect(persisted.getMap('chargen').toJSON()).toEqual(live.getMap('chargen').toJSON());
    expect(
      persisted.getMap('chargen').toJSON().characters['char-a'].terms[0].eventDescription
        .reviewLog[0].by,
    ).toBe('gm-signed');
    live.destroy();
    persisted.destroy();
    await app.close();
  });
});

describe('chargen session provisioning', () => {
  const provisionUrl = (id: string) => `/api/chargen/sessions/${id}/provision`;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['HOCUSPOCUS_JWT_SECRET'] = 'commands-test-secret';
    mocks.insert.mockResolvedValue(undefined);
    mocks.campaign.mockResolvedValue([]);
    mocks.members.mockResolvedValue([]);
  });

  it('rejects unauthenticated provisioning', async () => {
    // Given
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({ method: 'POST', url: provisionUrl('new-session') });
    // Then
    expect(response.statusCode).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
    await app.close();
  });

  it('creates the campaign and gm membership for a new session id', async () => {
    // Given
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: provisionUrl('new-session'),
      headers: { authorization: bearer('user-a') },
    });
    // Then
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ campaignId: 'new-session', role: 'gm' });
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-session', name: 'Chargen Session', ownerId: 'user-a' }),
    );
    expect(mocks.insert).toHaveBeenCalledWith({
      campaignId: 'new-session',
      userId: 'user-a',
      role: 'gm',
    });
    await app.close();
  });

  it('adds a second user as a player to an existing session', async () => {
    // Given
    mocks.campaign.mockResolvedValue([{ id: 'existing-session' }]);
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: provisionUrl('existing-session'),
      headers: { authorization: bearer('user-b') },
    });
    // Then
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ campaignId: 'existing-session', role: 'player' });
    expect(mocks.insert).toHaveBeenCalledWith({
      campaignId: 'existing-session',
      userId: 'user-b',
      role: 'player',
    });
    await app.close();
  });

  it('returns the existing role without inserting a duplicate membership', async () => {
    // Given
    mocks.campaign.mockResolvedValue([{ id: 'existing-session' }]);
    mocks.members.mockResolvedValue([{ role: 'gm' }]);
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: provisionUrl('existing-session'),
      headers: { authorization: bearer('user-a') },
    });
    // Then
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ campaignId: 'existing-session', role: 'gm' });
    expect(mocks.insert).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects session ids containing a colon', async () => {
    // Given
    const app = Fastify();
    await registerChargenCommandRoutes(app);
    // When
    const response = await app.inject({
      method: 'POST',
      url: provisionUrl('bad:id'),
      headers: { authorization: bearer('user-a') },
    });
    // Then
    expect(response.statusCode).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    await app.close();
  });
});
