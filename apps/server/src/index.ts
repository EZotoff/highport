import { startHocuspocus, HOCUSPOCUS_PORT } from './ws/hocuspocus.js';
import { startFastify, FASTIFY_PORT } from './api/index.js';
import { startCompactionJob } from './jobs/compaction.js';
import { logger } from './lib/logger.js';

async function main() {
  logger.info('[Highport Server] Starting...');

  logger.info(`[Hocuspocus] Starting WebSocket server on port ${HOCUSPOCUS_PORT}...`);
  await startHocuspocus();

  logger.info(`[Fastify] Starting REST API on port ${FASTIFY_PORT}...`);
  await startFastify();

  startCompactionJob();

  logger.info('[Highport Server] All servers started successfully');
}

main().catch((err) => {
  logger.error('[Highport Server] Fatal error:', err);
  process.exit(1);
});
