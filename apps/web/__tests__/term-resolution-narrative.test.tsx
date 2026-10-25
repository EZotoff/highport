import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { getCareer } from '@highport/mgt2e';
import TermResolutionStep from '../components/chargen/steps/TermResolutionStep';
import { getYDoc } from '../lib/ydoc';
import {
  createCharacter,
  getCharacter,
  getCharactersMap,
  updateCharacterFields,
} from '../lib/chargen/state';
import { useGMControls } from '../lib/chargen/useGMControls';
import type { AIProvenance, CareerTermResult } from '../lib/chargen/types';

vi.mock('../lib/ydoc', async (original) => ({
  ...(await original<typeof import('../lib/ydoc')>()),
  getYDoc: vi.fn(),
}));
vi.mock('../lib/chargen/useGMControls', () => ({ useGMControls: vi.fn() }));
vi.mock('../lib/chargen/useNarrative', () => ({
  useNarrativeAvailable: () => ({ isAvailable: true }),
  useEventNarrative: () => ({ generate: vi.fn(), isLoading: false }),
  useMishapNarrative: () => ({ generate: vi.fn(), isLoading: false }),
}));
vi.mock('../components/chargen/ConnectionSuggestions', () => ({ default: () => null }));
vi.mock('../components/chargen/EntitySpawnForm', () => ({ default: () => null }));
vi.mock('../lib/chargen/term-resolution', async (original) => ({
  ...(await original<typeof import('../lib/chargen/term-resolution')>()),
  rollSurvival: () => ({ rolls: [6, 6], modifier: 0, total: 12 }),
}));
vi.mock('@highport/mgt2e', async (original) => ({
  ...(await original<typeof import('@highport/mgt2e')>()),
  rollCareerEvent: () => ({
    roll: { rolls: [3, 4], modifier: 0, total: 7 },
    event: { roll: 7, description: 'Career fixture event' },
  }),
}));

describe('term narrative authoritative sync', () => {
  let doc: Y.Doc;
  let characterId: string;
  const draft: AIProvenance<string> = {
    value: 'draft text',
    source: 'ai',
    mode: 'brief',
    status: 'draft',
    pendingReviewBy: 'gm',
  };
  const term: CareerTermResult = {
    termNumber: 1,
    careerId: 'navy',
    assignmentId: getCareer('navy')?.assignments[0]?.id ?? '',
    startAge: 18,
    survived: false,
    advanced: false,
    currentRank: 0,
    skillsGained: [],
    spawnedEntities: [],
    eventDescription: draft,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    characterId = createCharacter(doc, 'player-1', 'Hero');
    updateCharacterFields(doc, characterId, { terms: [term] });
    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: null,
      pendingRequests: [],
      settings: {
        allowedCareers: [],
        aiVerbosity: 'brief',
        isLocked: false,
        gmApprovalMode: 'moderate',
        crossCharacterLinkMode: 'gm-mediated',
      },
      actions: {
        updateSettings: vi.fn(),
        toggleCareer: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
        endSession: vi.fn(),
        exportAllCharacters: vi.fn(),
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    doc.destroy();
  });

  function showEvent() {
    render(<TermResolutionStep characterId={characterId} currentUserId="player-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Roll Survival/ }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: /Roll Event/ }));
  }

  it('marks the narrative pending when a moderate-mode player sees a draft', () => {
    showEvent();
    expect(screen.getByDisplayValue('draft text')).toBeTruthy();
    expect(screen.getByText('Pending GM Approval')).toBeTruthy();
  });

  it('discards local draft edits when switching to a term with identical authoritative text', () => {
    showEvent();
    fireEvent.change(screen.getByRole('textbox', { name: 'Event narrative description' }), {
      target: { value: 'unsaved local text' },
    });
    const charMap = getCharactersMap(doc).get(characterId);
    if (!charMap) throw new Error('Missing character fixture');
    act(() => {
      charMap.set('terms', [{ ...term, termNumber: 2 }]);
    });
    expect(screen.getByDisplayValue('draft text')).toBeTruthy();
    expect(screen.queryByDisplayValue('unsaved local text')).toBeNull();
  });

  it('hides pending draft text when a strict-mode player views the event', () => {
    const controls = vi.mocked(useGMControls)();
    if (!controls.settings) throw new Error('Missing settings fixture');
    vi.mocked(useGMControls).mockReturnValue({
      ...controls,
      settings: { ...controls.settings, gmApprovalMode: 'strict' },
    });
    showEvent();
    expect(screen.queryByDisplayValue('draft text')).toBeNull();
    expect(screen.getByDisplayValue('Pending GM Review...')).toBeTruthy();
  });

  it.each(['edited', 'accepted', 'rejected'] as const)(
    'refreshes the narrative when the authoritative wrapper becomes %s',
    (status) => {
      showEvent();
      const character = getCharacter(doc, characterId);
      const charMap = getCharactersMap(doc).get(characterId);
      if (!character || !charMap) throw new Error('Missing character fixture');
      act(() => {
        charMap.set(
          'terms',
          character.terms.map((entry) => ({
            ...entry,
            eventDescription: {
              ...draft,
              value: 'gm text',
              source: 'gm',
              status,
              pendingReviewBy: null,
            },
          })),
        );
      });
      expect(screen.queryByDisplayValue('draft text')).toBeNull();
      expect(screen.queryByText('draft text')).toBeNull();
      if (status === 'rejected') {
        expect(screen.queryByDisplayValue('gm text')).toBeNull();
        expect(screen.queryByText('gm text')).toBeNull();
        expect(screen.getByText('Rejected')).toBeTruthy();
      } else if (status === 'edited') {
        expect(screen.getByDisplayValue('gm text')).toBeTruthy();
      } else {
        expect(screen.getByText('gm text')).toBeTruthy();
      }
    },
  );
});
