import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    env: { NEXT_PUBLIC_LOCAL_MODE: 'true' },
    setupFiles: ['./__tests__/local-session-setup.ts'],
    environment: 'jsdom',
    include: ['**/__tests__/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
