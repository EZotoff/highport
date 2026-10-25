import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSession } from 'next-auth/react';
import * as Y from 'yjs';
import { apiFetch } from '../lib/api-client';
import {
  createSession,
  getSession as getChargenSession,
  updateSessionSettings,
} from '../lib/chargen/state';

vi.mock('../lib/api-client', () => ({ apiFetch: vi.fn() }));

describe('authenticated chargen commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the server without mutating local Yjs when a signed session exists, even in local mode', async () => {
    // Given
    const doc = new Y.Doc();
    createSession(doc, 'campaign', 'gm');
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'gm' },
      apiToken: 'signed',
      expires: '2099-01-01',
    });
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
    // When
    await updateSessionSettings(doc, { isLocked: true });
    // Then
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/session/settings'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ isLocked: true }) }),
    );
    expect(getChargenSession(doc)?.settings.isLocked).toBe(false);
    doc.destroy();
  });

  it('propagates denial without applying a local mutation when the server rejects a command', async () => {
    // Given
    const doc = new Y.Doc();
    createSession(doc, 'campaign', 'gm');
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'player' },
      apiToken: 'signed',
      expires: '2099-01-01',
    });
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 403 }));
    // When / Then
    await expect(updateSessionSettings(doc, { isLocked: true })).rejects.toMatchObject({
      status: 403,
    });
    expect(getChargenSession(doc)?.settings.isLocked).toBe(false);
    doc.destroy();
  });
});
