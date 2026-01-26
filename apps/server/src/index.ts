import { startHocuspocus, HOCUSPOCUS_PORT } from './ws/hocuspocus.js';
import { startFastify, FASTIFY_PORT } from './api/index.js';
import { startCompactionJob } from './jobs/compaction.js';

async function main() {
  console.log('[PlaneShift Server] Starting...');
  
  console.log(`[Hocuspocus] Starting WebSocket server on port ${HOCUSPOCUS_PORT}...`);
  await startHocuspocus();
  
  console.log(`[Fastify] Starting REST API on port ${FASTIFY_PORT}...`);
  await startFastify();
  
  startCompactionJob();
  
  console.log('[PlaneShift Server] All servers started successfully');
}

main().catch((err) => {
  console.error('[PlaneShift Server] Fatal error:', err);
  process.exit(1);
});
