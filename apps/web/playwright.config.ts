import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:18120',
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter server dev',
      url: 'http://localhost:18121',
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
    {
      command: 'pnpm build && PORT=18120 pnpm start',
      url: 'http://localhost:18120',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
  ],
  globalSetup: './e2e/global-setup.ts',
});
