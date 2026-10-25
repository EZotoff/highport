import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { useAllCharacters, useCharacter, useSession } from '../lib/chargen/hooks';
import { createCharacter, createSession, getAllCharacters, getSession } from '../lib/chargen/state';

let joining: Y.Doc;
vi.mock('../lib/ydoc', () => ({ getYDoc: () => joining }));

describe('chargen join safety', () => {
  it('preserves session and characters when an unsynced client reads before joining', () => {
    // Given: higher client ID makes a competing empty map win deterministically.
    const creator = new Y.Doc();
    creator.clientID = 1;
    joining = new Y.Doc();
    joining.clientID = 2;
    createSession(creator, 'campaign', 'authenticated-gm');
    const charId = createCharacter(creator, 'authenticated-player', 'Survivor');
    const original = getSession(creator);
    const updates = vi.fn();
    joining.on('update', updates);
    const session = renderHook(useSession);
    const characters = renderHook(useAllCharacters);
    const character = renderHook(() => useCharacter(charId));
    expect(session.result.current).toBeNull();
    expect(characters.result.current).toEqual([]);
    expect(updates).not.toHaveBeenCalled();
    // When
    act(() => {
      Y.applyUpdate(joining, Y.encodeStateAsUpdate(creator));
      Y.applyUpdate(creator, Y.encodeStateAsUpdate(joining));
    });
    // Then
    expect(getSession(creator)).toEqual(original);
    expect(session.result.current).toEqual(original);
    expect(characters.result.current[0]?.name).toBe('Survivor');
    expect(getAllCharacters(creator)[0]?.name).toBe('Survivor');
    session.unmount();
    characters.unmount();
    character.unmount();
    creator.destroy();
    joining.destroy();
  });

  it('adopts the existing session when a second creator calls createSession', () => {
    // Given
    const doc = new Y.Doc();
    const id = createSession(doc, 'campaign', 'gm');
    const original = getSession(doc);
    const updates = vi.fn();
    doc.on('update', updates);
    // When
    const adopted = createSession(doc, 'other-campaign', 'other-gm');
    // Then
    expect(adopted).toBe(id);
    expect(getSession(doc)).toEqual(original);
    expect(updates).not.toHaveBeenCalled();
    doc.destroy();
  });
});
