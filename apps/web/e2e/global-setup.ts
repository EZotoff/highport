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
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Server at ${url} not ready after ${timeout}ms`);
}

export default async function globalSetup() {
  console.log('🚀 Waiting for Hocuspocus server on port 3001...');
  await waitForServer('http://localhost:3001', 60000);
  console.log('✓ All services ready. Starting E2E tests.');
}
