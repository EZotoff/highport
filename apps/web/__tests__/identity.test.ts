import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getOrCreateUser } from '../lib/identity';
import { MockUser } from '@planeshift/shared/types/identity';

describe('identity', () => {
  let store: Record<string, string> = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: localStorageMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a new user if none exists', () => {
    const user = getOrCreateUser();
    expect(user).toBeDefined();
    expect(user.userId).toBeDefined();
    expect(user.name).toBe('Anonymous');
    expect(user.isGM).toBe(false);
  });

  it('persists user in localStorage', () => {
    const user = getOrCreateUser();
    const stored = JSON.parse(localStorage.getItem('planeshift_user') || '{}');
    expect(stored.userId).toBe(user.userId);
  });

  it('detects GM promotion from URL', () => {
    vi.stubGlobal('window', {
      location: { search: '?gm=true' },
      localStorage: localStorageMock,
    });
    const user = getOrCreateUser();
    expect(user.isGM).toBe(true);
  });
});
