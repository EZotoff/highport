import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { ServiceRecord } from '../components/chargen/ServiceRecord';
import { createCharacter, getCharacter, updateCharacterFields } from '../lib/chargen/state';
import type { ChapterSummary, CareerTermResult } from '../lib/chargen/types';

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

const completedNavyTerm: CareerTermResult = {
  termNumber: 1,
  careerId: 'navy',
  assignmentId: 'line-crew',
  startAge: 18,
  survived: true,
  eventDescription: 'A frontier patrol ended in a desperate rescue under fire.',
  advanced: true,
  rankGained: 1,
  currentRank: 1,
  skillsGained: [{ skill: 'Gun Combat', level: 1 }],
  spawnedEntities: [],
};

describe('chapter summaries', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
    mocks.state.doc = doc;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    mocks.state.doc = null;
    doc.destroy();
  });

  it('appends a chapter summary when a term completes', () => {
    const characterId = createCharacter(doc, 'player-1', 'Record Keeper');

    updateCharacterFields(doc, characterId, {
      terms: [completedNavyTerm],
      age: 22,
    });

    const character = getCharacter(doc, characterId);

    expect(character?.chapters).toHaveLength(1);
    expect(character?.chapters[0]?.careerId).toBe('navy');
    expect(character?.chapters[0]?.keyEventDescription).toContain('desperate rescue');
    expect(character?.chapters[0]?.skillsGained).toEqual(['Gun Combat 1']);
    expect(character?.chapters[0]?.rankChange).toContain('Rank 1');
  });

  it('renders all finalized chapters in the Service Record view', () => {
    const characterId = createCharacter(doc, 'player-1', 'Record Keeper');

    const chapters: ChapterSummary[] = [
      {
        termNumber: 1,
        careerId: 'navy',
        careerName: 'Navy',
        age: 22,
        keyEventDescription: 'A frontier patrol ended in a desperate rescue under fire.',
        skillsGained: ['Gun Combat 1'],
        rankChange: 'Promoted to Rank 1',
        drafted: false,
      },
      {
        termNumber: 2,
        careerId: 'scout',
        careerName: 'Scout',
        age: 26,
        keyEventDescription: 'An uncharted jump left the ship listening to old distress calls.',
        skillsGained: ['Pilot 1'],
        drafted: true,
      },
    ];

    updateCharacterFields(doc, characterId, {
      status: 'finalized',
      terms: [completedNavyTerm],
      age: 22,
      chapters,
    });

    const character = getCharacter(doc, characterId);
    expect(character?.chapters).toEqual(chapters);

    render(<ServiceRecord chapters={chapters} characterName="Record Keeper" />);

    const heading = screen.getByRole('heading', { name: /service record/i });
    const serviceRecord = heading.closest('section');
    if (!serviceRecord) {
      throw new Error('Service Record section was not rendered');
    }
    const record = within(serviceRecord);

    expect(record.getByText('Chapter I · Age 22')).toBeTruthy();
    expect(record.getByText(/Chapter II/i)).toBeTruthy();
    expect(record.getByText(/desperate rescue/i)).toBeTruthy();
    expect(record.getByText(/Conscripted service/i)).toBeTruthy();
  });
});
