import { Hocuspocus } from '@hocuspocus/server';

const HOCUSPOCUS_PORT = 3001;

/**
 * Hocuspocus WebSocket server for Yjs real-time sync
 * 
 * IN-MEMORY ONLY - Database extension added in Task 4
 * 
 * Export the instance so Task 4 can extend it with Database hooks
 */
export const hocuspocus = new Hocuspocus({
  port: HOCUSPOCUS_PORT,
  
  async onRequest({ request, response }) {
    const origin = request.headers.origin;
    if (origin === 'http://localhost:3000') {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  },
  
  async onConnect({ documentName }) {
    console.log(`[Hocuspocus] Client connected to document: ${documentName}`);
  },
  
  async onDisconnect({ documentName, clientsCount }) {
    console.log(`[Hocuspocus] Client disconnected from ${documentName}, ${clientsCount} remaining`);
  },
  
  async onDestroy() {
    console.log('[Hocuspocus] Server destroyed');
  },
});

/**
 * Start Hocuspocus server
 * Note: Hocuspocus starts listening automatically when instantiated with port,
 * but we provide an explicit start function for clarity
 */
export async function startHocuspocus(): Promise<void> {
  console.log(`[Hocuspocus] WebSocket server listening on port ${HOCUSPOCUS_PORT}`);
}

export { HOCUSPOCUS_PORT };
