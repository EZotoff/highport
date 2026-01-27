import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerFoundryRoutes } from '../src/routes/foundry.js';
import WebSocket from 'ws';

describe('Foundry Routes', () => {
  let fastify: FastifyInstance;
  let address: string;
  const openSockets: WebSocket[] = [];

  beforeAll(async () => {
    fastify = Fastify();
    await registerFoundryRoutes(fastify);
    const addr = await fastify.listen({ port: 0, host: '127.0.0.1' });
    address = addr.replace('http://', 'ws://');
  });

  afterAll(async () => {
    await fastify.close();
  });

  afterEach(() => {
    for (const ws of openSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    openSockets.length = 0;
  });

  function createWebSocket(): WebSocket {
    const ws = new WebSocket(`${address}/foundry`);
    openSockets.push(ws);
    return ws;
  }

  function waitForOpen(ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      ws.once('open', () => resolve());
      ws.once('error', reject);
    });
  }

  function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      ws.once('message', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  it('accepts WebSocket connections on /foundry', async () => {
    const ws = createWebSocket();
    await waitForOpen(ws);
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it('responds to handshake with handshake_ack', async () => {
    const ws = createWebSocket();
    await waitForOpen(ws);

    const messagePromise = waitForMessage(ws);
    ws.send(JSON.stringify({ type: 'handshake', apiKey: 'test-key' }));

    const response = await messagePromise;
    expect(response.type).toBe('handshake_ack');
    expect(response.status).toBe('ok');
  });

  it('responds to actor_update with ack', async () => {
    const ws = createWebSocket();
    await waitForOpen(ws);

    const requestId = 'req-123';
    const messagePromise = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: 'actor_update',
        requestId,
        timestamp: Date.now(),
        payload: {
          actorId: 'actor_abc',
          actorName: 'Test Character',
          changes: { hp: { current: 10, max: 20 } },
          foundryUuid: 'Actor.abc123',
        },
      })
    );

    const response = await messagePromise;
    expect(response.type).toBe('ack');
    expect(response.requestId).toBe(requestId);
  });

  it('logs actor update details', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const ws = createWebSocket();
    await waitForOpen(ws);

    const messagePromise = waitForMessage(ws);
    ws.send(
      JSON.stringify({
        type: 'actor_update',
        requestId: 'req-456',
        payload: {
          actorId: 'actor_xyz',
          actorName: 'Test NPC',
          changes: { credits: 5000 },
          foundryUuid: 'Actor.xyz789',
        },
      })
    );

    await messagePromise;

    expect(consoleSpy).toHaveBeenCalledWith('[Foundry] Message received: actor_update');
    expect(consoleSpy).toHaveBeenCalledWith('[Foundry] Actor update: actor_xyz', { credits: 5000 });

    consoleSpy.mockRestore();
  });

  it('logs unknown message types', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const ws = createWebSocket();
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: 'unknown_type' }));

    await new Promise((r) => setTimeout(r, 100));

    expect(consoleSpy).toHaveBeenCalledWith('[Foundry] Unknown message type: unknown_type');

    consoleSpy.mockRestore();
  });
});
