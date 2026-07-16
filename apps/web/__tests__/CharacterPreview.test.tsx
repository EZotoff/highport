import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CharacterPreview from '../components/chargen/CharacterPreview';
import type { ChargenCharacter, ChapterSummary } from '../lib/chargen/types';

vi.mock('../lib/chargen/hooks', () => ({
  useCharacter: vi.fn(),
}));

vi.mock('../components/chargen/LifepathTimeline', () => ({
  LifepathTimeline: () => null,
}));

import { useCharacter } from '../lib/chargen/hooks';

const chapters: ChapterSummary[] = [
  {
    termNumber: 1,
    careerId: 'navy',
    careerName: 'Navy',
    age: 22,
    keyEventDescription: 'A desperate rescue under fire.',
    skillsGained: ['Gun Combat 1'],
    rankChange: 'Promoted to Rank 1',
    drafted: false,
  },
];

const finalizedCharacter: ChargenCharacter = {
  id: 'char-final',
  playerId: 'player-1',
  name: 'Finalized Hero',
  characteristics: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 },
  backgroundSkills: [],
  terms: [
    {
      termNumber: 1,
      careerId: 'navy',
      assignmentId: 'line_crew',
      startAge: 18,
      survived: true,
      advanced: false,
      currentRank: 1,
      skillsGained: [{ skill: 'Gun Combat', level: 1 }],
      spawnedEntities: [],
    },
  ],
  chapters,
  currentTermIndex: 0,
  status: 'finalized',
  skills: {},
  benefits: [],
  credits: 0,
  age: 22,
  spawnedEntityIds: [],
};

describe('CharacterPreview', () => {
  beforeEach(() => {
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

  it('renders the Service Record button for a finalized character and opens the modal', () => {
    vi.mocked(useCharacter).mockReturnValue(finalizedCharacter);

    render(<CharacterPreview characterId="char-final" />);

    const serviceRecordButton = screen.getByRole('button', { name: /Service Record/i });
    expect(serviceRecordButton).toBeTruthy();

    fireEvent.click(serviceRecordButton);

    const dialog = screen.getByRole('dialog', { name: /Service Record/i });
    expect(dialog).toBeTruthy();

    const modal = within(dialog);
    expect(modal.getAllByRole('heading', { name: /Service Record/i })).toHaveLength(2);
    expect(modal.getByText('A desperate rescue under fire.')).toBeTruthy();
  });
});
