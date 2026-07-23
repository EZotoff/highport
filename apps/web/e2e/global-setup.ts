import { execSync } from 'child_process';

async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        // 404 is fine - server is responding, just no content at root
        console.log(`✓ Server at ${url} is ready`);
        return;
      }
    } catch {
      // Server not ready, retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server at ${url} not ready after ${timeout}ms`);
}

async function ensurePostgres(): Promise<void> {
  try {
    // Check if postgres port is accepting connections
    const resp = await fetch('http://localhost:18123').catch(() => null);
    if (resp) return; // Something is listening
  } catch {
    // Not running
  }
  try {
    console.log('🐳 Starting PostgreSQL via docker-compose...');
    execSync('docker compose up -d postgres', { stdio: 'inherit' });
    await new Promise((r) => setTimeout(r, 5000));
    console.log('✓ PostgreSQL is ready');
  } catch {
    console.warn('⚠ Could not start PostgreSQL via docker. Ensure it is available on port 18123.');
  }
}

export default async function globalSetup() {
  await ensurePostgres();
  console.log('🚀 Waiting for Hocuspocus server on port 18121...');
  await waitForServer('http://localhost:18121', 60000);
  console.log('✓ All services ready. Starting E2E tests.');
}
