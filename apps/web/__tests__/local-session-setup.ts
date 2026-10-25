import { vi } from 'vitest';

vi.mock('next-auth/react', async (importOriginal) => {
  const original = await importOriginal<typeof import('next-auth/react')>();
  return { ...original, getSession: vi.fn(async () => null) };
});
