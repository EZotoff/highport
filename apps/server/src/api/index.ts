import Fastify from 'fastify';
import cors from '@fastify/cors';

const FASTIFY_PORT = 3002;

export const fastify = Fastify({ logger: true });

export async function startFastify(): Promise<void> {
  await fastify.register(cors, {
    origin: ['http://localhost:3000'],
  });

  fastify.get('/health', async () => {
    return { status: 'ok' };
  });

  try {
    await fastify.listen({ port: FASTIFY_PORT, host: '0.0.0.0' });
    console.log(`[Fastify] REST API listening on port ${FASTIFY_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export async function stopFastify(): Promise<void> {
  await fastify.close();
}

export { FASTIFY_PORT };
