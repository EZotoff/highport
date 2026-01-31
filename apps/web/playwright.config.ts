import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'PORT=3010 pnpm dev',
    url: 'http://localhost:3010',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  globalSetup: './e2e/global-setup.ts',
});
