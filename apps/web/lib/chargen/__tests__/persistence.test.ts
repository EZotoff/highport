import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { createCharacter, getCharacter, restoreCharacterSnapshot, updateCharacter } from '../state';
import { getSessionId } from '../../sync';

function createStorage(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

describe('chargen refresh persistence fallback', () => {
  let localStorageMock: Storage;
  let sessionStorageMock: Storage;

  beforeEach(() => {
    localStorageMock = createStorage();
    sessionStorageMock = createStorage();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('sessionStorage', sessionStorageMock);
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores character status and selections from a local snapshot when IndexedDB is late', () => {
    const originalDoc = new Y.Doc();
    const charId = createCharacter(originalDoc, 'player-1');

    updateCharacter(originalDoc, charId, 'name', 'Ada Freefall');
    updateCharacter(originalDoc, charId, 'backgroundSkills', ['admin', 'pilot', 'vacc-suit']);
    updateCharacter(originalDoc, charId, 'skills', {
      admin: 0,
      pilot: 0,
      'vacc-suit': 0,
    });
    updateCharacter(originalDoc, charId, 'status', 'career_selection');
    originalDoc.destroy();

    const reloadedDoc = new Y.Doc();
    expect(getCharacter(reloadedDoc, charId)).toBeNull();

    const restored = restoreCharacterSnapshot(reloadedDoc, charId);

    expect(restored?.name).toBe('Ada Freefall');
    expect(restored?.status).toBe('career_selection');
    expect(restored?.backgroundSkills).toEqual(['admin', 'pilot', 'vacc-suit']);
    expect(restored?.skills).toEqual({ admin: 0, pilot: 0, 'vacc-suit': 0 });
    expect(getCharacter(reloadedDoc, charId)?.status).toBe('career_selection');

    reloadedDoc.destroy();
  });

  it('keeps graph session ids durable by migrating sessionStorage ids into localStorage', () => {
    sessionStorage.setItem('highport_session_id:graph', 'session-123');

    expect(getSessionId('graph')).toBe('session-123');
    expect(localStorage.getItem('highport_session_id:graph')).toBe('session-123');
  });

  it('leaves an empty Yjs document unchanged when no local character snapshot exists', () => {
    const doc = new Y.Doc();

    expect(restoreCharacterSnapshot(doc, 'missing-char')).toBeNull();
    expect(getCharacter(doc, 'missing-char')).toBeNull();

    doc.destroy();
  });
});
