import * as Y from 'yjs';
import type { ChargenCharacter } from './types';

const CHARACTER_SNAPSHOTS_KEY = 'highport_chargen_character_snapshots';

function getStorage(): Storage | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function cloneForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readSnapshotStore(): Record<string, ChargenCharacter> {
  const storage = getStorage();
  if (!storage) return {};

  const storedJson = storage.getItem(CHARACTER_SNAPSHOTS_KEY);
  if (!storedJson) return {};

  try {
    const parsed = JSON.parse(storedJson) as unknown;
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, ChargenCharacter>;
    }
  } catch {
    return {};
  }

  return {};
}

function writeCharacterToMap(charMap: Y.Map<unknown>, character: ChargenCharacter): void {
  Object.entries(character).forEach(([key, value]) => {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      charMap.set(key, cloneForStorage(value));
    } else {
      charMap.set(key, value);
    }
  });
}

export function saveCharacterSnapshot(character: ChargenCharacter): void {
  const storage = getStorage();
  if (!storage) return;

  const snapshots = readSnapshotStore();
  snapshots[character.id] = cloneForStorage(character);
  storage.setItem(CHARACTER_SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function deleteCharacterSnapshot(charId: string): void {
  const storage = getStorage();
  if (!storage) return;

  const snapshots = readSnapshotStore();
  delete snapshots[charId];
  storage.setItem(CHARACTER_SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export function loadCharacterSnapshot(charId: string): ChargenCharacter | null {
  return readSnapshotStore()[charId] ?? null;
}

export function restoreCharacterSnapshot(doc: Y.Doc, charId: string): ChargenCharacter | null {
  const snapshot = loadCharacterSnapshot(charId);
  if (!snapshot) return null;

  const chargen = doc.getMap('chargen');
  if (!chargen.has('characters')) {
    chargen.set('characters', new Y.Map());
  }

  const characters = chargen.get('characters') as Y.Map<Y.Map<unknown>>;
  if (characters.has(charId)) return snapshot;

  doc.transact(() => {
    const charMap = new Y.Map<unknown>();
    writeCharacterToMap(charMap, snapshot);
    characters.set(charId, charMap);
  }, 'chargen-local-restore');

  return snapshot;
}
