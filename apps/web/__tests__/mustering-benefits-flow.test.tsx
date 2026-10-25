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
  expect(screen.getByText('Rolls Remaining').previousElementSibling?.textContent).toBe('2');
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
