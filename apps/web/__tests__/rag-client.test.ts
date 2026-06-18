import { describe, it, expect, vi, beforeEach } from 'vitest';
import { streamQuery, RagUnavailableError } from '../lib/rag-client';

// Mock identity module: streamQuery imports getOrCreateUser and getActiveCharacter
vi.mock('../lib/identity', () => ({
  getOrCreateUser: () => ({ userId: 'test-user', name: 'Test User', isGM: false }),
  getActiveCharacter: () => ({ characterId: 'char-1', name: 'Test Char' }),
}));

describe('streamQuery error classification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onError with RagUnavailableError when fetch rejects with TypeError (network error)', async () => {
    const fetchError = new TypeError('fetch failed');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(fetchError));

    const onError = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamQuery('test query', onChunk, onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(RagUnavailableError);
    expect(errorArg.message).toBe('RAG service unreachable');
    expect(onChunk).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('calls onError with RagUnavailableError when server responds 500', async () => {
    const response = new Response(null, { status: 500, statusText: 'Internal Server Error' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const onError = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamQuery('test query', onChunk, onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(RagUnavailableError);
    expect(errorArg.message).toContain('500');
    expect(onChunk).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('calls onError with RagUnavailableError when server responds 503', async () => {
    const response = new Response(null, { status: 503, statusText: 'Service Unavailable' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const onError = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamQuery('test query', onChunk, onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(RagUnavailableError);
    expect(errorArg.message).toContain('503');
  });

  it('calls onError with plain Error (not RagUnavailableError) when server responds 4xx', async () => {
    const response = new Response(null, { status: 400, statusText: 'Bad Request' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const onError = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamQuery('test query', onChunk, onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg).not.toBeInstanceOf(RagUnavailableError);
    expect(errorArg.message).toContain('400');
  });

  it('calls onError with plain Error (not RagUnavailableError) when server responds 404', async () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));

    const onError = vi.fn();
    const onChunk = vi.fn();
    const onDone = vi.fn();

    await streamQuery('test query', onChunk, onDone, onError);

    expect(onError).toHaveBeenCalledTimes(1);
    const errorArg = onError.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg).not.toBeInstanceOf(RagUnavailableError);
    expect(errorArg.message).toContain('404');
  });
});
