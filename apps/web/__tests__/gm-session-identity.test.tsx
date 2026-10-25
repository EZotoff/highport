import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGMControls } from '../lib/chargen/useGMControls';

const identity = vi.hoisted(() => ({ userId: 'player' }));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: identity.userId ? { user: { id: identity.userId } } : null }),
}));
vi.mock('../lib/chargen/hooks', () => ({ useSession: () => ({ createdBy: 'gm' }) }));
vi.mock('../lib/chargen/useConnectionRequests', () => ({
  useConnectionRequests: () => ({ requests: [] }),
}));

describe('GM session identity', () => {
  afterEach(() => localStorage.clear());
  it.each(['player', ''])(
    'keeps GM controls locked when localStorage spoofs GM and session is %s',
    (userId) => {
      // Given
      identity.userId = userId;
      localStorage.setItem('highport_user', JSON.stringify({ userId: 'gm', isGM: true }));
      // When
      const { result } = renderHook(() => useGMControls());
      // Then
      expect(result.current.isGM).toBe(false);
    },
  );
  it('enables UX controls when the authenticated session owns chargen', () => {
    // Given
    identity.userId = 'gm';
    // When
    const { result } = renderHook(() => useGMControls());
    // Then
    expect(result.current.isGM).toBe(true);
  });
});
