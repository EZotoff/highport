import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  clearDiceOverrideInterceptor,
  getAgingEffect,
  getCareer,
  setDiceOverrideInterceptor,
} from '@highport/mgt2e';
import { AgingResolution } from '../components/chargen/steps/AgingResolution';
import CareerSelectionStep from '../components/chargen/steps/CareerSelectionStep';
import TermResolutionStep from '../components/chargen/steps/TermResolutionStep';
import { createCharacter, getCharacter, updateCharacterFields } from '../lib/chargen/state';
import { getYDoc } from '../lib/ydoc';

vi.mock('../lib/ydoc', async (original) => ({
  ...(await original<typeof import('../lib/ydoc')>()),
  getYDoc: vi.fn(),
}));

let doc: Y.Doc;
let id: string;
beforeEach(() => {
  doc = new Y.Doc();
  vi.mocked(getYDoc).mockReturnValue(doc);
  id = createCharacter(doc, 'player', 'Veteran');
  updateCharacterFields(doc, id, {
    credits: 100000,
    age: 34,
    status: 'term_resolution',
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    terms: [
      {
        termNumber: 4,
        careerId: 'navy',
        assignmentId: 'line',
        startAge: 30,
        survived: true,
        advanced: false,
        currentRank: 0,
        skillsGained: [],
        spawnedEntities: [],
      },
    ],
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});
afterEach(() => {
  cleanup();
  clearDiceOverrideInterceptor();
  doc.destroy();
});

vi.mock('../lib/chargen/useGMControls', () => ({
  useGMControls: () => ({ isGM: false, settings: {} }),
}));
vi.mock('../lib/chargen/useNarrative', () => ({
  useNarrativeAvailable: () => ({ isAvailable: false }),
  useEventNarrative: () => ({ generate: vi.fn(), isLoading: false }),
  useMishapNarrative: () => ({ generate: vi.fn(), isLoading: false }),
}));
vi.mock('../components/chargen/ConnectionSuggestions', () => ({ default: () => null }));
vi.mock('../components/chargen/EntitySpawnForm', () => ({ default: () => null }));

function showAging(total: number) {
  const character = getCharacter(doc, id);
  if (!character) throw new Error('Missing character');
  return render(
    <AgingResolution
      character={character}
      check={{
        ...getAgingEffect(total),
        roll: { dice: '2d6', rolls: [1, 1], modifier: total - 2, total },
      }}
      onContinue={vi.fn()}
    />,
  );
}

function choosePhysical() {
  fireEvent.change(screen.getByLabelText(/Physical loss 1/), { target: { value: 'DEX' } });
  fireEvent.change(screen.getByLabelText(/Physical loss 2/), { target: { value: 'STR' } });
  fireEvent.change(screen.getByLabelText(/Physical loss 3/), { target: { value: 'END' } });
}

it('applies distinct magnitude slots when the ageing total is minus three', () => {
  // Given -3, when choosing DEX for the two-point loss, then only DEX loses two.
  showAging(-3);
  expect(screen.getByRole('button', { name: 'Apply Aging Effects' })).toHaveProperty(
    'disabled',
    true,
  );
  choosePhysical();
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  expect(getCharacter(doc, id)?.characteristics).toMatchObject({ STR: 6, DEX: 5, END: 6 });
});

it('allows SOC for the mental slot when the ageing total is minus six', () => {
  // Given -6, when selecting SOC, then all physical stats lose two and SOC loses one.
  showAging(-6);
  choosePhysical();
  fireEvent.change(screen.getByLabelText(/Mental loss/), { target: { value: 'SOC' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  expect(getCharacter(doc, id)?.characteristics).toEqual({
    STR: 5,
    DEX: 5,
    END: 5,
    INT: 7,
    EDU: 7,
    SOC: 6,
  });
});

it('spends rolled medical costs and restores one when paying for an ageing crisis', () => {
  // Given STR 1 and a crisis costing Cr20,000, when paying, then STR is 1 and credits fall.
  updateCharacterFields(doc, id, {
    characteristics: { STR: 1, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  });
  showAging(0);
  setDiceOverrideInterceptor(() => ({ total: 2 }));
  fireEvent.change(screen.getByLabelText(/Physical loss 1/), { target: { value: 'STR' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  expect(getCharacter(doc, id)?.characteristics.STR).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: /Pay Cr20,000/ }));
  expect(getCharacter(doc, id)).toMatchObject({
    credits: 80000,
    characteristics: { STR: 1 },
    terms: [{ agingCrisis: 'paid', agingCrisisCost: 20000, agingResolved: true }],
  });
});

it('records death when medical care is declined', () => {
  // Given a crisis, when declining care, then the character is marked dead.
  updateCharacterFields(doc, id, {
    characteristics: { STR: 1, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  });
  showAging(0);
  fireEvent.change(screen.getByLabelText(/Physical loss 1/), { target: { value: 'STR' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  fireEvent.click(screen.getByRole('button', { name: /Decline care/ }));
  expect(getCharacter(doc, id)?.terms[0].agingCrisis).toBe('died');
});

it('auto-fails qualification after surviving an ageing crisis even with a winning roll', () => {
  // Given a paid crisis, when attempting qualification, then even a twelve fails.
  const character = getCharacter(doc, id);
  if (!character) throw new Error('Missing character');
  updateCharacterFields(doc, id, {
    status: 'career_selection',
    terms: character.terms.map((term) => ({ ...term, agingCrisis: 'paid' })),
  });
  setDiceOverrideInterceptor(() => ({ total: 12, success: true }));
  render(<CareerSelectionStep characterId={id} />);
  fireEvent.click(screen.getAllByRole('button', { name: /Try to Join/ })[0]);
  expect(screen.queryByText('Choose Assignment')).toBeNull();
  expect(screen.getByText(/Qualification Failed/)).toBeTruthy();
});

it('keeps apply disabled when loss slots are filled out of order but one is missing', () => {
  // Given three loss slots, when only slots two and three are filled, then apply stays disabled.
  showAging(-3);
  fireEvent.change(screen.getByLabelText(/Physical loss 2/), { target: { value: 'STR' } });
  fireEvent.change(screen.getByLabelText(/Physical loss 3/), { target: { value: 'END' } });
  expect(screen.getByRole('button', { name: 'Apply Aging Effects' })).toHaveProperty(
    'disabled',
    true,
  );
});

it('prevents medical payment when the Traveller cannot afford the rolled cost', () => {
  // Given Cr0, when a crisis costs Cr60,000, then care cannot be purchased.
  updateCharacterFields(doc, id, {
    credits: 0,
    characteristics: { STR: 1, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  });
  showAging(0);
  setDiceOverrideInterceptor(() => ({ total: 6 }));
  fireEvent.change(screen.getByLabelText(/Physical loss 1/), { target: { value: 'STR' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  expect(screen.getByRole('button', { name: /Pay Cr60,000/ })).toHaveProperty('disabled', true);
  expect(getCharacter(doc, id)?.credits).toBe(0);
});

it('retains the rolled crisis cost across remounts instead of rerolling', () => {
  // Given a persisted crisis, when remounted with different dice, then its original cost is retained.
  updateCharacterFields(doc, id, {
    characteristics: { STR: 1, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  });
  const view = showAging(0);
  setDiceOverrideInterceptor(() => ({ total: 2 }));
  fireEvent.change(screen.getByLabelText(/Physical loss 1/), { target: { value: 'STR' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply Aging Effects' }));
  view.unmount();
  setDiceOverrideInterceptor(() => ({ total: 6 }));
  showAging(0);
  fireEvent.click(screen.getByRole('button', { name: /Pay Cr20,000/ }));
  expect(getCharacter(doc, id)?.credits).toBe(80000);
});

it('resumes the saved crisis after asynchronous character loading in the term screen', () => {
  // Given a saved unresolved crisis, when the term screen mounts, then payment resumes rather than survival.
  const character = getCharacter(doc, id);
  if (!character) throw new Error('Missing character');
  updateCharacterFields(doc, id, {
    characteristics: { ...character.characteristics, STR: 1 },
    terms: character.terms.map((term) => ({
      ...term,
      assignmentId: getCareer('navy')?.assignments[0].id ?? '',
      agingRoll: { dice: '2d6', rolls: [2, 2], modifier: -4, total: 0 },
      agingCrisisCost: 20000,
      agingPhysicalLosses: ['STR'],
      agingMentalLosses: [],
      agingMusteringOut: true,
    })),
  });
  render(<TermResolutionStep characterId={id} currentUserId="player" />);
  expect(screen.getByRole('button', { name: /Pay Cr20,000/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Roll Survival/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /Pay Cr20,000/ }));
  expect(getCharacter(doc, id)?.status).toBe('mustering_out');
});
