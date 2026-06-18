import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PortraitStorage, PortraitStorageResult } from '../src/storage/portrait-storage.js';
import { PortraitService, PortraitUnavailableError } from '../src/services/portrait-service.js';
import type { PortraitTags } from '@highport/shared/types/portrait';

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual<typeof import('drizzle-orm')>('drizzle-orm');
  return {
    ...actual,
    eq: () => undefined,
    and: () => undefined,
  };
});

vi.mock('../src/db/client.js', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(async () => {}),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => {}),
      })),
    })),
  },
}));

class NoopPortraitStorage implements PortraitStorage {
  async savePortrait(
    _data: Buffer,
    _mimeType: string,
    _portraitId: string,
  ): Promise<PortraitStorageResult> {
    return { storageKey: 'test.png', sizeBytes: 0 };
  }

  async loadPortrait(_storageKey: string): Promise<Buffer> {
    return Buffer.from('test');
  }
}

const baseTags: PortraitTags = {
  story: { entity_type: 'npc' },
  demographics: { gender: 'female', age_range: 'adult' },
};

describe('PortraitService RAG-unavailable error classification', () => {
  let service: PortraitService;
  let storage: NoopPortraitStorage;

  beforeEach(() => {
    vi.restoreAllMocks();
    storage = new NoopPortraitStorage();
    service = new PortraitService(storage);
  });

  it('throws PortraitUnavailableError when fetch rejects with TypeError (network error)', async () => {
    const fetchError = new TypeError('fetch failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchError));

    await expect(
      service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(PortraitUnavailableError);

    await expect(
      service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        userId: 'user-1',
      }),
    ).rejects.toThrow(/Portrait generation unavailable: network error/);
  });

  it('throws PortraitUnavailableError when RAG image endpoint returns 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string) => {
        if (input.toString().endsWith('/ai/portraits/tags')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        if (input.toString().endsWith('/ai/portraits/image')) {
          return new Response(JSON.stringify({ detail: 'Service overloaded' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    let caught: unknown;
    try {
      await service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        appearanceText: 'A test character',
        userId: 'user-1',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PortraitUnavailableError);
    expect((caught as Error).message).toBe('Service overloaded');
  });

  it('throws PortraitUnavailableError when RAG image endpoint returns 500', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string) => {
        if (input.toString().endsWith('/ai/portraits/tags')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        if (input.toString().endsWith('/ai/portraits/image')) {
          return new Response(JSON.stringify({}), { status: 500 });
        }
        return new Response(null, { status: 404 });
      }),
    );

    await expect(
      service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        appearanceText: 'A test character',
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(PortraitUnavailableError);
  });

  it('throws generic Error (not PortraitUnavailableError) when RAG returns 400', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (input: string) => {
        if (input.toString().endsWith('/ai/portraits/tags')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        if (input.toString().endsWith('/ai/portraits/image')) {
          return new Response(JSON.stringify({ detail: 'Invalid prompt parameters' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(null, { status: 404 });
      }),
    );

    await expect(
      service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        appearanceText: 'A test character',
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(Error);

    try {
      await service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        appearanceText: 'A test character',
        userId: 'user-1',
      });
    } catch (error) {
      expect(error).not.toBeInstanceOf(PortraitUnavailableError);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Invalid prompt parameters');
    }
  });

  it('throws PortraitUnavailableError when generateImage fetch rejects without tags extraction path', async () => {
    const fetchError = new TypeError('connect ECONNREFUSED');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchError));

    // No appearanceText -> skip extractTags, go straight to generateImage
    await expect(
      service.generatePortrait({
        campaignId: 'camp-1',
        tags: baseTags,
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(PortraitUnavailableError);
  });
});
