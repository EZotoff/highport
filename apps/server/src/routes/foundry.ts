import { FastifyInstance } from 'fastify';
import websocket, { type SocketStream } from '@fastify/websocket';

type FoundrySocket = SocketStream['socket'];

interface ActorUpdatePayload {
  actorId: string;
  actorName: string;
  changes: Record<string, unknown>;
  foundryUuid: string;
}

interface NodeUpdatePayload {
  nodeId: string;
  foundryUuid: string;
  changes: Record<string, unknown>;
}

interface FoundryMessage {
  type: string;
  requestId?: string;
  apiKey?: string;
  payload?: ActorUpdatePayload | NodeUpdatePayload;
  timestamp?: number;
}

const foundryClients = new Set<FoundrySocket>();

export function broadcastToFoundry(msg: FoundryMessage): void {
  const data = JSON.stringify(msg);
  for (const client of foundryClients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
}

export function broadcastNodeUpdate(
  nodeId: string,
  foundryUuid: string,
  changes: Record<string, unknown>
): void {
  const message: FoundryMessage = {
    type: 'node_update',
    timestamp: Date.now(),
    payload: { nodeId, foundryUuid, changes },
  };
  broadcastToFoundry(message);
}

function handleFoundryMessage(socket: FoundrySocket, msg: FoundryMessage): void {
  console.log(`[Foundry] Message received: ${msg.type}`);

  switch (msg.type) {
    case 'handshake':
      console.log(`[Foundry] Handshake received. API key present: ${!!msg.apiKey}`);
      socket.send(JSON.stringify({ type: 'handshake_ack', status: 'ok' }));
      break;
    case 'actor_update': {
      const payload = msg.payload as ActorUpdatePayload | undefined;
      console.log(`[Foundry] Actor update: ${payload?.actorId}`, payload?.changes);
      socket.send(JSON.stringify({ type: 'ack', requestId: msg.requestId }));
      break;
    }
    default:
      console.log(`[Foundry] Unknown message type: ${msg.type}`);
  }
}

export async function registerFoundryRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(websocket);

  fastify.get('/foundry', { websocket: true }, (connection: SocketStream, _req) => {
    console.log('[Foundry] Client connected');
    const socket = connection.socket;

    foundryClients.add(socket);

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
      foundryClients.delete(socket);
    });

    socket.on('error', (err) => {
      console.error('[Foundry] Socket error:', err);
      foundryClients.delete(socket);
    });
  });
}
