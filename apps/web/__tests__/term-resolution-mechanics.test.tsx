import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  clearDiceOverrideInterceptor,
  getCareer,
  rollCareerEvent,
  setDiceOverrideInterceptor,
  type CareerEvent,
} from '@highport/mgt2e';
import TermResolutionStep from '../components/chargen/steps/TermResolutionStep';
import { createCharacter, getCharacter, updateCharacterFields } from '../lib/chargen/state';
import { getYDoc } from '../lib/ydoc';

vi.mock('../lib/ydoc', async (original) => ({
  ...(await original<typeof import('../lib/ydoc')>()),
  getYDoc: vi.fn(),
}));
vi.mock('@highport/mgt2e', async (original) => ({
  ...(await original<typeof import('@highport/mgt2e')>()),
  rollCareerEvent: vi.fn(),
}));
vi.mock('../lib/chargen/useGMControls', () => ({
  useGMControls: () => ({
    isGM: false,
    settings: { aiVerbosity: 'brief', gmApprovalMode: 'moderate' },
  }),
}));
vi.mock('../lib/chargen/useNarrative', () => ({
  useNarrativeAvailable: () => ({ isAvailable: false }),
  useEventNarrative: () => ({ generate: vi.fn(), isLoading: false }),
  useMishapNarrative: () => ({ generate: vi.fn(), isLoading: false }),
}));
vi.mock('../components/chargen/ConnectionSuggestions', () => ({ default: () => null }));
vi.mock('../components/chargen/EntitySpawnForm', () => ({ default: () => null }));

describe('term mechanical interactions', () => {
  let doc: Y.Doc;
  let id: string;
  const career = getCareer('navy');
  if (!career) throw new Error('Missing career fixture');

  beforeEach(() => {
    vi.useFakeTimers();
    doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    id = createCharacter(doc, 'player', 'Hero');
    updateCharacterFields(doc, id, {
      age: 18,
      skills: {},
      characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
      terms: [
        {
          termNumber: 1,
          careerId: 'navy',
          assignmentId: career.assignments[0].id,
          startAge: 18,
          survived: false,
          advanced: false,
          currentRank: 0,
          skillsGained: [],
          spawnedEntities: [],
        },
      ],
    });
    setDiceOverrideInterceptor(({ total, target }) =>
      target === undefined ? { total } : { total: target, success: true },
    );
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
  });
  afterEach(() => {
    cleanup();
    clearDiceOverrideInterceptor();
    vi.useRealTimers();
    doc.destroy();
  });

  function showEvent(event: CareerEvent) {
    vi.mocked(rollCareerEvent).mockReturnValue({
      roll: { dice: '2d6', rolls: [6, 6], total: event.roll, modifier: 0 },
      event,
    });
    render(<TermResolutionStep characterId={id} currentUserId="player" />);
    fireEvent.click(screen.getByRole('button', { name: /Roll Survival/ }));
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole('button', { name: /Roll Event/ }));
  }

  it('gates continuation and applies the selected event effects in one transaction', () => {
    const event = {
      roll: 12,
      description: 'Choose outcome',
      effects: [{ type: 'characteristic', target: 'INT', value: 1 }],
      choices: [
        {
          id: 'learn',
          description: 'Learn naval tactics',
          effects: [{ type: 'skill', target: 'tactics.naval', value: 1 }],
        },
        {
          id: 'bonus',
          description: 'Gain advancement bonus',
          effects: [{ type: 'special', target: 'next_advancement_dm', value: 4 }],
        },
      ],
    } satisfies CareerEvent;
    showEvent(event);
    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Continue' });
    expect(button.disabled).toBe(true);
    expect(getCharacter(doc, id)?.characteristics.INT).toBe(7);
    fireEvent.click(screen.getByRole('radio', { name: 'Learn naval tactics' }));
    expect(button.disabled).toBe(false);
    const transactions = vi.fn();
    doc.on('afterTransaction', transactions);
    fireEvent.click(button);
    expect(transactions).toHaveBeenCalledTimes(1);
    expect(getCharacter(doc, id)).toMatchObject({
      characteristics: { INT: 8 },
      skills: { tactics: 0, 'tactics.naval': 1 },
      terms: [{ eventChoice: 'learn', eventEffectsApplied: true }],
    });
  });

  it('consumes automatic commission without rolling dice', () => {
    const event = career.events.find((entry) => entry.roll === 12);
    if (!event) throw new Error('Missing event fixture');
    showEvent(event);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Service Skills' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll 1d6' }));
    act(() => vi.advanceTimersByTime(1500));
    clearDiceOverrideInterceptor();
    fireEvent.click(screen.getByRole('button', { name: 'Attempt Commission' }));
    expect(getCharacter(doc, id)?.terms[0]).toMatchObject({
      commissioned: true,
      commissionRoll: { dice: 'event automatic commission', rolls: [], success: true },
    });
    expect(getCharacter(doc, id)?.terms[0].autoPassNext).toBeUndefined();
    act(() => vi.advanceTimersByTime(1500));
    expect(getCharacter(doc, id)?.age).toBe(22);
  });

  it('consumes the stored advancement DM when commission is skipped', () => {
    showEvent({
      roll: 10,
      description: 'Advancement bonus',
      effects: [{ type: 'special', target: 'next_advancement_dm', value: 4 }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Service Skills' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll 1d6' }));
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.click(screen.getByRole('button', { name: 'Skip Commission' }));
    clearDiceOverrideInterceptor();
    fireEvent.click(screen.getByRole('button', { name: 'Roll Advancement' }));
    expect(getCharacter(doc, id)?.terms[0].advancementRoll?.modifier).toBe(4);
    expect(getCharacter(doc, id)?.terms[0].eventAdvancementDM).toBe(0);
  });

  it('transfers automatic commission to advancement when the player skips commission', () => {
    showEvent({
      roll: 12,
      description: 'Automatic promotion',
      effects: [
        { type: 'special', target: 'next_promotion_or_commission', value: 'automatic_pass' },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Service Skills' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll 1d6' }));
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.click(screen.getByRole('button', { name: 'Skip Commission' }));
    clearDiceOverrideInterceptor();
    fireEvent.click(screen.getByRole('button', { name: 'Roll Advancement' }));
    expect(getCharacter(doc, id)?.terms[0]).toMatchObject({
      advanced: true,
      advancementRoll: { dice: 'event automatic advancement', rolls: [], success: true },
    });
    expect(getCharacter(doc, id)?.terms[0].autoPassNext).toBeUndefined();
  });
});
