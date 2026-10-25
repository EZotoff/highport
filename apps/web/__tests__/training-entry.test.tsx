import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import {
  clearDiceOverrideInterceptor,
  getCareer,
  setDiceOverrideInterceptor,
} from '@highport/mgt2e';
import CareerSelectionStep from '../components/chargen/steps/CareerSelectionStep';
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
  id = createCharacter(doc, 'player', 'Recruit');
  updateCharacterFields(doc, id, {
    skills: {},
    characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
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

it.each(['qualified', 'drifter', 'drafted'])(
  'grants entry training atomically when entering as %s',
  (route) => {
    setDiceOverrideInterceptor(() => ({ total: route === 'qualified' ? 12 : 2 }));
    render(<CareerSelectionStep characterId={id} />);
    fireEvent.click(screen.getAllByRole('button', { name: /try to join/i })[0]);
    if (route === 'qualified') {
      const career = getCareer('agent');
      if (!career) throw new Error('Missing career');
      const transaction = vi.fn();
      doc.on('afterTransaction', transaction);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(career.assignments[0].name) }));
      expect(transaction).toHaveBeenCalledTimes(1);
    } else if (route === 'drifter') {
      fireEvent.click(screen.getByRole('button', { name: /become drifter/i }));
    } else {
      fireEvent.click(screen.getByRole('button', { name: /submit to draft/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm draft submission/i }));
      fireEvent.click(screen.getByRole('button', { name: /begin drafted term/i }));
    }
    const character = getCharacter(doc, id);
    const term = character?.terms[0];
    const career = term && getCareer(term.careerId);
    if (!character || !term || !career) throw new Error('Entry did not create a term');
    for (const entry of career.skillTables.service) {
      const alternatives = entry.skill.split('|');
      const granted = alternatives.filter((skill) => character.skills[skill] === 0);
      expect(granted).toHaveLength(1);
      expect(term.skillsGained).toContainEqual({ skill: granted[0], level: 0 });
    }
    expect(character.status).toBe('term_resolution');
  },
);
