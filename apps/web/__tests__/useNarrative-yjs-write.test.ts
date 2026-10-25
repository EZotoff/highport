import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import * as Y from 'yjs';
import { getYDoc } from '../lib/ydoc';
import {
  createCharacter,
  addCrossCharacterLink,
  getCrossCharacterLinks,
  getCrossCharacterLinksMap,
} from '../lib/chargen/state';
import { useCrossCharacterLinks } from '../lib/chargen/useNarrative';
import { generateCrossCharacterLinks } from '../lib/chargen/narrative';

vi.mock('../lib/ydoc', async () => ({
  ...(await vi.importActual<typeof import('../lib/ydoc')>('../lib/ydoc')),
  getYDoc: vi.fn(),
}));
vi.mock('../lib/chargen/narrative', () => ({
  generateCrossCharacterLinks: vi.fn(),
}));

describe('narrative generation Yjs writes', () => {
  it('persists only new proposals when generation includes an existing duplicate', async () => {
    // Given
    const doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    const sourceCharId = createCharacter(doc, 'player-1', 'Zara');
    const targetCharId = createCharacter(doc, 'player-2', 'Milo');
    const existing = { sourceCharId, targetCharId, relationship: 'Rival', description: '' };
    const seededId = addCrossCharacterLink(doc, existing);
    vi.mocked(generateCrossCharacterLinks).mockResolvedValueOnce([
      { ...existing, id: 'generated-duplicate', status: 'pending', generatedAt: 1 },
      { ...existing, relationship: 'Ally', id: 'generated-new', status: 'pending', generatedAt: 1 },
    ]);
    const { result, unmount } = renderHook(() => useCrossCharacterLinks(true));
    // When
    await act(async () => {
      await result.current.refresh();
    });
    // Then
    expect(result.current.error).toBeNull();
    const links = getCrossCharacterLinks(doc);
    expect(links).toHaveLength(2);
    expect(links.filter((link) => link.relationship === 'Rival')).toHaveLength(1);
    const added = links.find((link) => link.id !== seededId);
    expect(added?.relationship).toBe('Ally');
    if (!added) throw new Error('Missing generated proposal');
    const raw = getCrossCharacterLinksMap(doc).get(added.id);
    expect(raw?.get('id')).toBe(added.id);
    expect(raw?.get('status')).toBe('pending');
    expect(raw?.get('generatedAt')).toEqual(expect.any(Number));
    expect(added.id).not.toBe('generated-new');
    unmount();
    doc.destroy();
  });
});
