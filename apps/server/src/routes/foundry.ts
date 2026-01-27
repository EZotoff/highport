import { FastifyInstance } from 'fastify';
import websocket, { type SocketStream } from '@fastify/websocket';
import type { WebSocket as WS } from 'ws';

interface ActorUpdatePayload {
  actorId: string;
  actorName: string;
  changes: Record<string, unknown>;
  foundryUuid: string;
}

interface FoundryMessage {
  type: string;
  requestId?: string;
  apiKey?: string;
  payload?: ActorUpdatePayload;
  timestamp?: number;
}

function handleFoundryMessage(socket: WS, msg: FoundryMessage): void {
  console.log(`[Foundry] Message received: ${msg.type}`);

  switch (msg.type) {
    case 'handshake':
      console.log(`[Foundry] Handshake received. API key present: ${!!msg.apiKey}`);
      socket.send(JSON.stringify({ type: 'handshake_ack', status: 'ok' }));
      break;
    case 'actor_update':
      console.log(`[Foundry] Actor update: ${msg.payload?.actorId}`, msg.payload?.changes);
      // TODO Task 15: Update Yjs graph node metadata
      socket.send(JSON.stringify({ type: 'ack', requestId: msg.requestId }));
      break;
    default:
      console.log(`[Foundry] Unknown message type: ${msg.type}`);
  }
}

export async function registerFoundryRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(websocket);

  fastify.get('/foundry', { websocket: true }, (connection: SocketStream, _req) => {
    console.log('[Foundry] Client connected');
    const socket = connection.socket;

    socket.on('message', (data) => {
      try {
        const msg: FoundryMessage = JSON.parse(data.toString());
        handleFoundryMessage(socket, msg);
      } catch (e) {
        console.error('[Foundry] Failed to parse message:', e);
      }
    });

    socket.on('close', () => {
      console.log('[Foundry] Client disconnected');
    });

    socket.on('error', (err) => {
      console.error('[Foundry] Socket error:', err);
    });
  });
}
