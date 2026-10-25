import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { resetRandomSeed, setRandomSeed } from '@highport/mgt2e';
import MusteringOutStep from '../components/chargen/steps/MusteringOutStep';
import { createCharacter, getCharacter, updateCharacterFields } from '../lib/chargen/state';
import { createCharacterNode } from '../lib/chargen/finalize';
import { getNodesMap, getYDoc } from '../lib/ydoc';

vi.mock('../lib/ydoc', async (original) => ({
  ...(await original<typeof import('../lib/ydoc')>()),
  getYDoc: vi.fn(),
}));

let doc: Y.Doc;
let id: string;
beforeEach(() => {
  vi.useFakeTimers();
  doc = new Y.Doc();
  vi.mocked(getYDoc).mockReturnValue(doc);
  id = createCharacter(doc, 'player', 'Veteran');
  updateCharacterFields(doc, id, {
    status: 'mustering_out',
    benefits: [],
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
    terms: [
      {
        termNumber: 1,
        careerId: 'navy',
        assignmentId: 'line',
        startAge: 18,
        survived: true,
        advanced: false,
        currentRank: 5,
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
  vi.useRealTimers();
  resetRandomSeed();
  doc.destroy();
});

it('persists characteristic and benefit record in one transaction when rolled', () => {
  render(<MusteringOutStep characterId={id} />);
  setRandomSeed(7);
  const transactions = vi.fn();
  doc.on('afterTransaction', transactions);
  fireEvent.click(screen.getByRole('button', { name: /Roll Benefits/ }));
  expect(transactions).toHaveBeenCalledTimes(1);
  expect(getCharacter(doc, id)).toMatchObject({
    characteristics: { INT: 8 },
    benefits: ['+1 INT'],
    mustering: { rollsUsed: 1 },
  });
  expect(screen.getByText('Rolls Remaining').previousElementSibling?.textContent).toBe('3');
});

it('finalizes the mechanically increased characteristic into actual node metadata', () => {
  render(<MusteringOutStep characterId={id} />);
  setRandomSeed(7);
  fireEvent.click(screen.getByRole('button', { name: /Roll Benefits/ }));
  const character = getCharacter(doc, id);
  if (!character) throw new Error('Missing character');
  const finalized = createCharacterNode(character);
  expect(getNodesMap(doc).get(finalized.graphNodeId)?.get('metadata')).toMatchObject({
    characteristics: { INT: 8 },
    benefits: ['+1 INT'],
  });
});

it('preserves roll order across reload when cash precedes a benefit', () => {
  // Given
  render(<MusteringOutStep characterId={id} />);
  setRandomSeed(7);
  fireEvent.click(screen.getByRole('button', { name: /Roll Cash/ }));
  setRandomSeed(7);
  // When
  fireEvent.click(screen.getByRole('button', { name: /Roll Benefits/ }));
  cleanup();
  render(<MusteringOutStep characterId={id} />);
  // Then
  expect(getCharacter(doc, id)?.mustering?.rollHistory).toMatchObject([
    { rollNumber: 1, type: 'cash', roll: 2 },
    { rollNumber: 2, type: 'benefit', roll: 2, result: '+1 INT' },
  ]);
  expect(screen.getByText('#1')).toBeTruthy();
  expect(screen.getByText('#2')).toBeTruthy();
});

it.each(['+1 EDU', 'Two Ship Shares'])(
  'defers effects and persists only %s when a compound choice is picked',
  (choice) => {
    // Given: navy rank 5 adds 1 to seed 9's roll of 2.
    const view = render(<MusteringOutStep characterId={id} />);
    setRandomSeed(9);
    // When: roll a compound benefit.
    fireEvent.click(screen.getByRole('button', { name: /Roll Benefits/ }));
    // Then: a persisted pending choice, no mechanical grant or ledger entry yet.
    expect(screen.getByRole('group', { name: 'Choose one benefit' })).toBeTruthy();
    expect(getCharacter(doc, id)).toMatchObject({
      characteristics: { EDU: 7 },
      benefits: [],
      mustering: { shipShares: 0, rollsUsed: 1 },
    });
    expect(screen.getByRole('button', { name: /Roll Benefits/ })).toHaveProperty('disabled', true);
    view.unmount();
    render(<MusteringOutStep characterId={id} />);
    fireEvent.click(screen.getByRole('button', { name: choice }));
    expect(getCharacter(doc, id)).toMatchObject({
      characteristics: { EDU: choice === '+1 EDU' ? 8 : 7 },
      benefits: [choice],
      mustering: {
        rollsUsed: 1,
        benefits: [choice],
        shipShares: choice === 'Two Ship Shares' ? 2 : 0,
        rollHistory: [{ rollNumber: 1, type: 'benefit', roll: 3, result: choice }],
      },
    });
    expect(screen.queryByRole('group', { name: 'Choose one benefit' })).toBeNull();
    cleanup();
    render(<MusteringOutStep characterId={id} />);
    expect(screen.getByText(choice)).toBeTruthy();
  },
);

it('disables a fourth cash roll but allows a benefit after three lifetime cash rolls', () => {
  // Given three previous cash rolls, when mustering resumes, then only benefits remain available.
  updateCharacterFields(doc, id, {
    mustering: {
      totalRolls: 4,
      rollsUsed: 3,
      cashRollsUsed: 3,
      benefits: [],
      credits: 0,
      shipShares: 0,
    },
  });
  render(<MusteringOutStep characterId={id} />);
  expect(screen.getByRole('button', { name: /Roll Cash/ })).toHaveProperty('disabled', true);
  setRandomSeed(7);
  fireEvent.click(screen.getByRole('button', { name: /Roll Benefits/ }));
  expect(getCharacter(doc, id)?.mustering).toMatchObject({
    rollsUsed: 4,
    cashRollsUsed: 3,
    benefits: ['+1 INT'],
  });
});
