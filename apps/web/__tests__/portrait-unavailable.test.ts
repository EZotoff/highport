import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePortraitGenerator, PortraitUnavailableError } from '../lib/portrait/usePortrait';
import { act, renderHook } from '@testing-library/react';

vi.mock('../lib/identity', () => ({
  getOrCreateUser: () => ({ userId: 'test-user', name: 'Test User', isGM: false }),
}));

vi.mock('../lib/ydoc', () => ({
  getYDoc: vi.fn(() => ({})),
}));

vi.mock('../lib/yjs-helpers', () => ({
  updateNodeMetadata: vi.fn(),
}));

const mockPortrait = {
  id: 'portrait_test1',
  campaign_id: 'camp-1',
  subject_node_id: 'node-1',
  anchor_portrait_id: undefined,
  source_portrait_id: undefined,
  family_group_id: undefined,
  protected: false,
  source_policy: 'campaign',
  tags: { story: { entity_type: 'npc' } },
  prompt: 'test prompt',
  prompt_fingerprint: 'abc123',
  model_id: 'gemini',
  storage_key: 'key',
  mime_type: 'image/png',
  size_bytes: 1024,
  created_by_user_id: 'user-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  image_url: '/api/portraits/portrait_test1/image',
};

describe('usePortraitGenerator RAG-unavailable detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets unavailable=true and throws PortraitUnavailableError on 503 with rag_unavailable (generate)', async () => {
    const responseBody = JSON.stringify({
      error: 'rag_unavailable',
      message: 'Portrait generation unavailable (503)',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(responseBody, {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { result } = renderHook(() => usePortraitGenerator());

    await act(async () => {
      try {
        await result.current.generate({
          campaignId: 'camp-1',
          tags: { story: { entity_type: 'npc' } },
        });
      } catch (err) {
        expect(err).toBeInstanceOf(PortraitUnavailableError);
      }
    });

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets unavailable=true and throws PortraitUnavailableError on 503 with rag_unavailable (remix)', async () => {
    const responseBody = JSON.stringify({
      error: 'rag_unavailable',
      message: 'Portrait remix unavailable (503)',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(responseBody, {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { result } = renderHook(() => usePortraitGenerator());

    await act(async () => {
      try {
        await result.current.remix({
          portraitId: 'portrait_src',
          campaignId: 'camp-1',
          promptDelta: 'make older',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(PortraitUnavailableError);
      }
    });

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error (not unavailable) on non-503 error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Bad request' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { result } = renderHook(() => usePortraitGenerator());

    await act(async () => {
      try {
        await result.current.generate({
          campaignId: 'camp-1',
          tags: { story: { entity_type: 'npc' } },
        });
      } catch {
        // expected
      }
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it('sets error (not unavailable) on 503 without rag_unavailable error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'internal_error', message: 'Something went wrong' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const { result } = renderHook(() => usePortraitGenerator());

    await act(async () => {
      try {
        await result.current.generate({
          campaignId: 'camp-1',
          tags: { story: { entity_type: 'npc' } },
        });
      } catch {
        // expected
      }
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it('resets unavailable to false on successful generation after a previous failure', async () => {
    const failBody = JSON.stringify({
      error: 'rag_unavailable',
      message: 'Portrait generation unavailable (503)',
    });

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(failBody, {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify(mockPortrait), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }),
    );

    const { result } = renderHook(() => usePortraitGenerator());

    await act(async () => {
      try {
        await result.current.generate({
          campaignId: 'camp-1',
          tags: { story: { entity_type: 'npc' } },
        });
      } catch {
        // first call fails
      }
    });

    expect(result.current.unavailable).toBe(true);

    await act(async () => {
      const portrait = await result.current.generate({
        campaignId: 'camp-1',
        tags: { story: { entity_type: 'npc' } },
      });
      expect(portrait.id).toBe(mockPortrait.id);
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
