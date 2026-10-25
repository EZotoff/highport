import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as Y from 'yjs';
import { getYDoc } from '../lib/ydoc';
import * as hooks from '../lib/chargen/hooks';
import {
  createCharacter,
  createSession,
  addCrossCharacterLink,
  getCharactersMap,
  getCrossCharacterLinksMap,
  getSessionMap,
  getEntityPoolMap,
  getConnectionRequestsArray,
  getLifepathProposalsMap,
} from '../lib/chargen/state';

vi.mock('../lib/ydoc', async () => ({
  ...(await vi.importActual<typeof import('../lib/ydoc')>('../lib/ydoc')),
  getYDoc: vi.fn(),
}));

describe('chargen hook observers', () => {
  let doc: Y.Doc;
  beforeEach(() => {
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
  });
  afterEach(() => {
    doc.destroy();
    vi.restoreAllMocks();
  });

  it('reflects seeded characters and later writes, then unsubscribes on unmount', () => {
    // Given
    const first = createCharacter(doc, 'player-1', 'Zara');
    const map = getCharactersMap(doc);
    const observe = vi.spyOn(map, 'observeDeep');
    const unobserve = vi.spyOn(map, 'unobserveDeep');
    const render = vi.fn();
    const { result, unmount } = renderHook(() => {
      render();
      return hooks.useAllCharacters();
    });
    expect(result.current.map((character) => character.id)).toEqual([first]);
    // When
    act(() => {
      createCharacter(doc, 'player-2', 'Milo');
    });
    // Then
    expect(result.current.map((character) => character.name)).toEqual(['Zara', 'Milo']);
    unmount();
    expect(unobserve).toHaveBeenCalledWith(observe.mock.calls[0]?.[0]);
    const renders = render.mock.calls.length;
    act(() => {
      createCharacter(doc, 'player-3', 'After unmount');
    });
    expect(render).toHaveBeenCalledTimes(renders);
  });

  it('reflects seeded links and merged votes, then unsubscribes on unmount', () => {
    // Given
    const id = addCrossCharacterLink(doc, {
      sourceCharId: 'char-1',
      targetCharId: 'char-2',
      relationship: 'Rival',
      description: '',
      acceptedBy: ['char-1'],
    });
    const map = getCrossCharacterLinksMap(doc);
    const observe = vi.spyOn(map, 'observeDeep');
    const unobserve = vi.spyOn(map, 'unobserveDeep');
    const { result, unmount } = renderHook(() => hooks.useCrossCharacterLinks());
    expect(result.current[0]?.status).toBe('pending');
    const replica = new Y.Doc();
    Y.applyUpdate(replica, Y.encodeStateAsUpdate(doc));
    const acceptedBy = getCrossCharacterLinksMap(replica).get(id)?.get('acceptedBy');
    if (!(acceptedBy instanceof Y.Map)) throw new Error('Missing acceptance map');
    acceptedBy.set('char-2', true);
    // When
    act(() => {
      Y.applyUpdate(doc, Y.encodeStateAsUpdate(replica));
    });
    // Then
    expect(result.current[0]?.status).toBe('accepted');
    unmount();
    expect(unobserve).toHaveBeenCalledWith(observe.mock.calls[0]?.[0]);
    act(() => {
      map.delete(id);
    });
    expect(result.current).toHaveLength(1);
    replica.destroy();
  });

  it.each(['character', 'session', 'entityPool', 'requests', 'lifepath'] as const)(
    'cleans up the %s subscription when unmounted',
    (kind) => {
      // Given
      const id = createCharacter(doc, 'player-1', 'Zara');
      createSession(doc, 'campaign', 'gm');
      const subscriptions = {
        character: { map: getCharactersMap(doc), useHook: () => hooks.useCharacter(id) },
        session: { map: getSessionMap(doc), useHook: hooks.useSession },
        entityPool: { map: getEntityPoolMap(doc), useHook: hooks.useEntityPool },
        requests: { map: getConnectionRequestsArray(doc), useHook: hooks.useConnectionRequests },
        lifepath: { map: getLifepathProposalsMap(doc), useHook: hooks.useLifepathProposals },
      };
      const subscription = subscriptions[kind];
      const observe = vi.spyOn(subscription.map, 'observeDeep');
      const unobserve = vi.spyOn(subscription.map, 'unobserveDeep');
      const { unmount } = renderHook(() => subscription.useHook());
      // When
      unmount();
      // Then
      expect(observe).toHaveBeenCalledTimes(1);
      expect(unobserve).toHaveBeenCalledTimes(1);
      expect(unobserve).toHaveBeenCalledWith(observe.mock.calls[0]?.[0]);
    },
  );
});
