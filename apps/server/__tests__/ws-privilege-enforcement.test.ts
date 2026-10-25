import { IncomingMessage as HttpRequest } from 'node:http';
import { Socket } from 'node:net';
import WebSocket from 'ws';
import * as Y from 'yjs';
import {
  Connection,
  Debugger,
  Document,
  IncomingMessage,
  MessageType,
  OutgoingMessage,
} from '@hocuspocus/server';
import { describe, expect, it, vi } from 'vitest';
import { hocuspocus } from '../src/ws/hocuspocus.js';
import { map } from '../src/services/chargen-command.js';

function fixture(): Document {
  const doc = new Document('camp:graph');
  const characters = new Y.Map<unknown>();
  doc.getMap('chargen').set('characters', characters);
  const character = new Y.Map<unknown>();
  characters.set('character', character);
  character.set('playerId', 'owner');
  character.set('name', 'original');
  character.set('terms', [{ eventDescription: { value: 'draft', status: 'draft' } }]);
  const other = new Y.Map<unknown>();
  characters.set('other', other);
  other.set('playerId', 'other-owner');
  const links = new Y.Map<unknown>();
  doc.getMap('chargen').set('crossCharacterLinks', links);
  const link = new Y.Map<unknown>();
  links.set('link', link);
  link.set('sourceCharId', 'character');
  link.set('targetCharId', 'other');
  link.set('acceptedBy', new Y.Map<unknown>());
  link.set('status', 'pending');
  return doc;
}

function frame(doc: Document, envelope: number, syncType: number): Uint8Array {
  const client = new Y.Doc();
  client.getMap('chargen');
  Y.applyUpdate(client, Y.encodeStateAsUpdate(doc));
  const vector = Y.encodeStateVector(client);
  map(client.getMap('chargen').get('characters')).delete('character');
  const outgoing = new OutgoingMessage(doc.name);
  if (envelope === MessageType.SyncReply) outgoing.createSyncReplyMessage();
  else outgoing.createSyncMessage();
  const bytes = outgoing.writeUpdate(Y.encodeStateAsUpdate(client, vector)).toUint8Array();
  const reader = new IncomingMessage(bytes);
  reader.readVarString();
  reader.readVarUint();
  bytes[reader.decoder.pos] = syncType;
  client.destroy();
  return bytes;
}

async function deliver(doc: Document, bytes: Uint8Array, userId: string) {
  // ws requires server-side options at runtime, but its null-address overload omits them.
  const socketValue: unknown = Reflect.construct(WebSocket, [null, undefined, { autoPong: true }]);
  if (!(socketValue instanceof WebSocket)) throw new Error('Expected WebSocket');
  const socket = socketValue;
  const request = new HttpRequest(new Socket());
  const connection = new Connection(
    socket,
    request,
    doc,
    60_000,
    'test-socket',
    { userId },
    false,
    new Debugger(),
  );
  const notifications: unknown[] = [];
  const outcome = new Promise<'accepted' | 'rejected'>((resolve) => {
    vi.spyOn(socket, 'send').mockImplementation((data) => {
      if (!(data instanceof Uint8Array)) throw new Error('Expected binary message');
      const message = new IncomingMessage(data);
      message.readVarString();
      const type = message.readVarUint();
      if (type === MessageType.Stateless) notifications.push(JSON.parse(message.readVarString()));
      if (type === MessageType.SyncStatus) resolve('accepted');
    });
    connection.onClose(() => resolve('rejected'));
  });
  connection.beforeHandleMessage((connection, update) =>
    hocuspocus.hooks('beforeHandleMessage', {
      clientsCount: 1,
      context: { userId },
      document: doc,
      documentName: doc.name,
      instance: hocuspocus,
      requestHeaders: {},
      requestParameters: new URLSearchParams(),
      update,
      socketId: 'test-socket',
      connection,
    }),
  );
  try {
    connection.handleMessage(bytes);
    return { outcome: await outcome, notifications };
  } finally {
    connection.close();
    request.destroy();
  }
}

describe('configured Hocuspocus pre-merge enforcement', () => {
  it.each([
    [MessageType.Sync, 2],
    [MessageType.Sync, 1],
    [MessageType.SyncReply, 2],
    [MessageType.SyncReply, 1],
  ])(
    'rejects non-owner deletion in envelope %s sync subtype %s and notifies the connection',
    async (envelope, syncType) => {
      // Given
      const doc = fixture();
      let updates = 0;
      doc.on('update', () => updates++);
      // When
      const result = await deliver(doc, frame(doc, envelope, syncType), 'other-member');
      // Then
      expect(result.outcome).toBe('rejected');
      expect(result.notifications).toEqual([
        expect.objectContaining({ type: 'privilege_rejected' }),
      ]);
      expect(map(doc.getMap('chargen').get('characters')).has('character')).toBe(true);
      expect(updates).toBe(0);
      doc.destroy();
    },
  );

  it.each([
    [MessageType.Sync, 2],
    [MessageType.Sync, 1],
    [MessageType.SyncReply, 2],
    [MessageType.SyncReply, 1],
  ])(
    'accepts owner deletion in envelope %s sync subtype %s exactly once',
    async (envelope, syncType) => {
      // Given
      const doc = fixture();
      let updates = 0;
      doc.on('update', () => updates++);
      // When
      const result = await deliver(doc, frame(doc, envelope, syncType), 'owner');
      // Then
      expect(result).toEqual({ outcome: 'accepted', notifications: [] });
      expect(map(doc.getMap('chargen').get('characters')).has('character')).toBe(false);
      expect(updates).toBe(1);
      doc.destroy();
    },
  );

  it.each(['acceptedBy', 'provenance'])(
    'rejects a member forging %s over the configured connection',
    async (field) => {
      // Given
      const doc = fixture();
      const client = new Y.Doc();
      client.getMap('chargen');
      Y.applyUpdate(client, Y.encodeStateAsUpdate(doc));
      const vector = Y.encodeStateVector(client);
      if (field === 'acceptedBy') {
        const link = map(map(client.getMap('chargen').get('crossCharacterLinks')).get('link'));
        map(link.get('acceptedBy')).set('character', true);
      } else {
        map(map(client.getMap('chargen').get('characters')).get('character')).set('terms', [
          { eventDescription: { value: 'draft', status: 'accepted' } },
        ]);
      }
      const bytes = new OutgoingMessage(doc.name)
        .createSyncMessage()
        .writeUpdate(Y.encodeStateAsUpdate(client, vector))
        .toUint8Array();
      const before = doc.getMap('chargen').toJSON();
      // When
      const result = await deliver(doc, bytes, 'other-owner');
      // Then
      expect(result.outcome).toBe('rejected');
      expect(result.notifications).toHaveLength(1);
      expect(doc.getMap('chargen').toJSON()).toEqual(before);
      client.destroy();
      doc.destroy();
    },
  );

  it('passes both owners dual acceptance through the configured connection', async () => {
    // Given
    const doc = fixture();
    const client = new Y.Doc();
    client.getMap('chargen');
    Y.applyUpdate(client, Y.encodeStateAsUpdate(doc));
    const link = map(map(client.getMap('chargen').get('crossCharacterLinks')).get('link'));
    const votes = map(link.get('acceptedBy'));
    // When
    for (const [party, userId] of [
      ['character', 'owner'],
      ['other', 'other-owner'],
    ]) {
      const vector = Y.encodeStateVector(client);
      client.transact(() => {
        votes.set(party, true);
        link.set('status', party === 'other' ? 'accepted' : 'pending');
      });
      const bytes = new OutgoingMessage(doc.name)
        .createSyncMessage()
        .writeUpdate(Y.encodeStateAsUpdate(client, vector))
        .toUint8Array();
      expect((await deliver(doc, bytes, userId)).outcome).toBe('accepted');
    }
    // Then
    const accepted = map(map(doc.getMap('chargen').get('crossCharacterLinks')).get('link'));
    expect(map(accepted.get('acceptedBy')).toJSON()).toEqual({ character: true, other: true });
    expect(accepted.get('status')).toBe('accepted');
    client.destroy();
    doc.destroy();
  });
});
