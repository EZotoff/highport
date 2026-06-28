import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import type { CareerAssignment } from '@highport/mgt2e';
import { resetRandomSeed, setRandomSeed } from '@highport/mgt2e';
import CareerSelectionStep from '../components/chargen/steps/CareerSelectionStep';
import TermResolutionStep from '../components/chargen/steps/TermResolutionStep';
import { createCharacter, getCharacter, updateCharacterFields } from '../lib/chargen/state';
import { rollSurvival } from '../lib/chargen/term-resolution';

const mocks = vi.hoisted(() => {
  const state = { doc: null as Y.Doc | null };
  return {
    state,
    getYDoc: vi.fn(() => {
      if (!state.doc) {
        throw new Error('test Y.Doc not configured');
      }
      return state.doc;
    }),
  };
});

vi.mock('../lib/ydoc', () => ({
  getYDoc: mocks.getYDoc,
}));

vi.mock('../lib/chargen/useNarrative', () => ({
  useNarrativeAvailable: () => ({ isAvailable: false }),
  useEventNarrative: () => ({
    generate: vi.fn(),
    isLoading: false,
    error: null,
    unavailable: true,
  }),
}));

function createCareerSelectionCharacter(doc: Y.Doc): string {
  const characterId = createCharacter(doc, 'player-1', 'Draft Candidate');
  updateCharacterFields(doc, characterId, {
    characteristics: { STR: 2, DEX: 2, END: 2, INT: 2, EDU: 2, SOC: 2 },
    status: 'career_selection',
  });
  return characterId;
}

function createDraftedTermCharacter(doc: Y.Doc): string {
  const characterId = createCharacter(doc, 'player-1', 'Draft Survivor');
  updateCharacterFields(doc, characterId, {
    characteristics: { STR: 6, DEX: 6, END: 7, INT: 6, EDU: 6, SOC: 6 },
    status: 'term_resolution',
    terms: [
      {
        termNumber: 1,
        careerId: 'army',
        assignmentId: 'support',
        startAge: 18,
        survived: false,
        advanced: false,
        currentRank: 0,
        skillsGained: [],
        spawnedEntities: [],
        drafted: true,
        survivalDmBonus: 2,
      },
    ],
    currentTermIndex: 0,
  });
  return characterId;
}

describe('Conscription draft flow', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
    mocks.state.doc = doc;
  });

  afterEach(() => {
    resetRandomSeed();
    mocks.state.doc = null;
    doc.destroy();
  });

  it('enables explicit Submit to Draft after failed qualification and creates a drafted first term', async () => {
    const characterId = createCareerSelectionCharacter(doc);
    setRandomSeed(1234);

    render(<CareerSelectionStep characterId={characterId} />);

    const joinButtons = await screen.findAllByRole('button', { name: /try to join/i });
    fireEvent.click(joinButtons[0]);
    expect(await screen.findByText(/Qualification Failed/i)).toBeTruthy();

    const submitButton = screen.getByRole('button', { name: /submit to draft/i });
    expect(submitButton.hasAttribute('disabled')).toBe(false);
    fireEvent.click(submitButton);
    expect(await screen.findByRole('dialog', { name: /submit to draft/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /confirm draft submission/i }));
    expect(await screen.findByText(/Draft roll/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /begin drafted term/i }));

    await waitFor(() => {
      const character = getCharacter(doc, characterId);
      expect(character?.status).toBe('term_resolution');
      expect(character?.terms).toHaveLength(1);
      expect(['army', 'marine', 'merchant', 'navy']).toContain(character?.terms[0]?.careerId);
      expect(character?.terms[0]?.careerId).not.toBe('drifter');
      expect(character?.terms[0]?.drafted).toBe(true);
      expect(character?.terms[0]?.survivalDmBonus).toBe(2);
    });
  });

  it('adds the first-term conscription survival DM without skipping survival', async () => {
    const characterId = createDraftedTermCharacter(doc);
    setRandomSeed(1234);

    render(<TermResolutionStep characterId={characterId} verbosity="brief" />);

    expect(await screen.findByText(/Conscription survival DM \+2/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /roll survival/i }));

    await waitFor(() => {
      const character = getCharacter(doc, characterId);
      expect(character?.terms[0]?.survivalRoll?.modifier).toBe(2);
      expect(character?.terms[0]?.survived).toBe(true);
    });
  });

  it('rollSurvival applies an explicit conscription survival DM bonus', () => {
    const character = getCharacter(doc, createDraftedTermCharacter(doc));
    const assignment: CareerAssignment = {
      id: 'draft-duty',
      name: 'Draft Duty',
      description: 'A drafted assignment.',
      survival: { characteristic: 'END', target: 8 },
      advancement: { characteristic: 'EDU', target: 8 },
      skillTable: [],
    };

    if (!character) {
      throw new Error('character fixture was not created');
    }

    setRandomSeed(1234);
    const result = rollSurvival(character, assignment, 2);

    expect(result.modifier).toBe(2);
    expect(result.target).toBe(8);
    expect(result.success).toBe(result.total >= 8);
  });
});
