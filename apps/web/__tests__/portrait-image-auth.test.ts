import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../app/api/portraits/[portraitId]/image/route';
import { normalizeImageUrl } from '../lib/portrait/image-url';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), fetch: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));

describe('portrait image session proxy', () => {
  it.each(['/api/portraits/p/image', 'http://localhost:18122/api/portraits/p/image'])(
    'routes API image %s through the same-origin session proxy',
    (url) => {
      expect(normalizeImageUrl(url)).toBe('/api/portraits/p/image');
    },
  );
  beforeEach(() => {
    vi.stubGlobal('fetch', mocks.fetch);
    vi.clearAllMocks();
  });
  it('rejects image access when no authenticated session exists', async () => {
    // Given
    mocks.auth.mockResolvedValue(null);
    // When
    const response = await GET(new Request('http://web/api/portraits/p/image'), {
      params: { portraitId: 'p' },
    });
    // Then
    expect(response.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('forwards signed identity and image bytes when the session is authenticated', async () => {
    // Given
    mocks.auth.mockResolvedValue({ apiToken: 'signed-token' });
    mocks.fetch.mockResolvedValue(
      new Response('image-bytes', { headers: { 'Content-Type': 'image/png' } }),
    );
    // When
    const response = await GET(new Request('http://web/api/portraits/p/image'), {
      params: { portraitId: 'p' },
    });
    // Then
    expect(await response.text()).toBe('image-bytes');
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/portraits\/p\/image$/),
      expect.objectContaining({
        headers: { Authorization: 'Bearer signed-token' },
        cache: 'no-store',
      }),
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('preserves denial when the API rejects campaign access', async () => {
    // Given
    mocks.auth.mockResolvedValue({ apiToken: 'outsider-token' });
    mocks.fetch.mockResolvedValue(new Response('denied', { status: 403 }));
    // When
    const response = await GET(new Request('http://web/api/portraits/p/image'), {
      params: { portraitId: 'p' },
    });
    // Then
    expect(response.status).toBe(403);
  });
});
