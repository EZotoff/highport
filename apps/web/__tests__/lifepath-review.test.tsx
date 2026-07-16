import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import FinalizeStep from '../components/chargen/steps/FinalizeStep';
import type { ChargenCharacter, ChargenSessionConfig } from '../lib/chargen/types';

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
    addLifepathProposal: vi.fn(),
    resolveLifepathProposal: vi.fn(),
    updateCharacterFields: vi.fn(),
  };
});

vi.mock('../lib/ydoc', () => ({
  getYDoc: mocks.getYDoc,
}));

vi.mock('../lib/chargen/state', () => ({
  updateCharacterFields: mocks.updateCharacterFields,
  addLifepathProposal: mocks.addLifepathProposal,
  resolveLifepathProposal: mocks.resolveLifepathProposal,
  addCrossCharacterLink: vi.fn(),
}));

vi.mock('../lib/chargen/hooks', () => ({
  useCharacter: vi.fn(),
  useSession: vi.fn(),
  useLifepathProposals: vi.fn(),
  useAllCharacters: vi.fn(() => []),
  useCrossCharacterLinks: vi.fn(() => []),
}));

vi.mock('../lib/chargen/useNarrative', () => ({
  useLifepathReview: vi.fn(),
  useNarrativeAvailable: vi.fn(() => ({ isAvailable: true, isChecking: false })),
  useCrossCharacterLinks: vi.fn(() => ({
    proposals: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

vi.mock('../lib/chargen/narrative', () => ({
  generateCrossCharacterLinks: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../lib/graph/shared-history', () => ({
  findSharedHistory: vi.fn(() => []),
}));

vi.mock('../lib/chargen/useGMControls', () => ({
  useGMControls: vi.fn(),
}));

vi.mock('../lib/portrait/usePortrait', () => ({
  usePortraitGenerator: vi.fn(),
  attachPortraitRecord: vi.fn(),
  attachPortraitToNode: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/components/portrait/PortraitLibrary', () => ({
  PortraitLibrary: () => null,
}));

vi.mock('@/components/portrait/PortraitRemixer', () => ({
  PortraitRemixer: () => null,
}));

import { useCharacter, useSession, useLifepathProposals } from '../lib/chargen/hooks';
import { useLifepathReview, useNarrativeAvailable } from '../lib/chargen/useNarrative';
import { useGMControls } from '../lib/chargen/useGMControls';
import { usePortraitGenerator } from '../lib/portrait/usePortrait';

const mockCharacter: ChargenCharacter = {
  id: 'char-1',
  playerId: 'player-1',
  name: 'Zara',
  characteristics: { STR: 7, DEX: 9, END: 8, INT: 10, EDU: 7, SOC: 8 },
  backgroundSkills: [],
  terms: [
    {
      termNumber: 1,
      careerId: 'navy',
      assignmentId: 'line_crew',
      startAge: 18,
      survived: true,
      advanced: false,
      currentRank: 0,
      skillsGained: [],
      spawnedEntities: [],
    },
  ],
  chapters: [],
  currentTermIndex: 0,
  status: 'mustering_out',
  skills: {},
  benefits: [],
  credits: 0,
  age: 22,
  spawnedEntityIds: [],
};

const mockSession: ChargenSessionConfig = {
  id: 'session-1',
  campaignId: 'campaign-1',
  createdAt: Date.now(),
  createdBy: 'gm-1',
  status: 'active',
  settings: {
    allowedCareers: [],
    aiVerbosity: 'inspiration',
    isLocked: false,
    gmApprovalMode: 'moderate',
    crossCharacterLinkMode: 'gm-mediated',
  },
};

describe('FinalizeStep lifepath review flow', () => {
  beforeEach(() => {
    mocks.state.doc = new Y.Doc();
    mocks.addLifepathProposal.mockReset();
    mocks.resolveLifepathProposal.mockReset();
    mocks.updateCharacterFields.mockReset();

    vi.mocked(useCharacter).mockReturnValue(mockCharacter);
    vi.mocked(useSession).mockReturnValue(mockSession);
    vi.mocked(useLifepathProposals).mockReturnValue([]);
    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: null,
      settings: mockSession.settings,
      pendingRequests: [],
      actions: {
        updateSettings: vi.fn(),
        toggleCareer: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
        endSession: vi.fn(),
        exportAllCharacters: vi.fn(),
      },
    });
    vi.mocked(usePortraitGenerator).mockReturnValue({
      generate: vi.fn(),
      remix: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });
    vi.mocked(useNarrativeAvailable).mockReturnValue({
      isAvailable: true,
      isChecking: false,
    });
  });

  afterEach(() => {
    mocks.state.doc?.destroy();
  });

  it('renders Review Lifepath button only when RAG is available', () => {
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    expect(screen.getByRole('button', { name: /Review Lifepath/i })).toBeTruthy();
  });

  it('shows the narrative unavailable notice when RAG is unavailable', () => {
    vi.mocked(useNarrativeAvailable).mockReturnValue({ isAvailable: false, isChecking: false });
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    expect(screen.queryByRole('button', { name: /Review Lifepath/i })).toBeNull();
    expect(screen.getByText(/AI-generated narrative details are optional/i)).toBeTruthy();
  });

  it('stores generated proposals in Yjs as pending in moderate mode', async () => {
    const generatedProposals = [
      {
        id: 'proposal-1',
        type: 'plot-hook' as const,
        targetTerm: 1,
        title: 'Stowaway mystery',
        description: 'A stowaway appears in term 1.',
        status: 'pending' as const,
        generatedAt: 1234567890,
      },
      {
        id: 'proposal-2',
        type: 'coherence-edit' as const,
        targetTerm: 1,
        title: 'Fix term coherence',
        description: 'The event contradicts prior skills.',
        proposedEdit: 'Mention the pilot training.',
        status: 'pending' as const,
        generatedAt: 1234567890,
      },
    ];

    const generate = vi.fn(() => Promise.resolve(generatedProposals));
    vi.mocked(useLifepathReview).mockReturnValue({
      generate,
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Review Lifepath/i }));
    });

    await waitFor(() => {
      expect(mocks.addLifepathProposal).toHaveBeenCalledTimes(2);
    });

    expect(mocks.addLifepathProposal).toHaveBeenNthCalledWith(
      1,
      expect.any(Y.Doc),
      expect.objectContaining({ title: 'Stowaway mystery', status: 'pending' }),
    );
    expect(mocks.addLifepathProposal).toHaveBeenNthCalledWith(
      2,
      expect.any(Y.Doc),
      expect.objectContaining({ title: 'Fix term coherence', status: 'pending' }),
    );
    expect(generate).toHaveBeenCalledWith(mockCharacter, undefined, false);
    expect(mocks.updateCharacterFields).toHaveBeenCalledWith(expect.any(Y.Doc), 'char-1', {
      reviewVersion: 1,
      lastReviewedFingerprint: JSON.stringify({
        terms: mockCharacter.terms,
        skills: mockCharacter.skills,
        chapters: mockCharacter.chapters,
      }),
    });
  });

  it('stores generated proposals as accepted in lenient mode', async () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: true,
      session: { ...mockSession, settings: { ...mockSession.settings, gmApprovalMode: 'lenient' } },
      settings: { ...mockSession.settings, gmApprovalMode: 'lenient' },
      pendingRequests: [],
      actions: {
        updateSettings: vi.fn(),
        toggleCareer: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
        endSession: vi.fn(),
        exportAllCharacters: vi.fn(),
      },
    });
    const generate = vi.fn().mockResolvedValue([
      {
        id: 'proposal-1',
        type: 'plot-hook',
        targetTerm: 1,
        title: 'Stowaway mystery',
        description: 'A stowaway appears in term 1.',
        status: 'pending',
        generatedAt: 1,
      },
    ]);
    vi.mocked(useLifepathReview).mockReturnValue({
      generate,
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Review Lifepath/i }));
    });

    await waitFor(() => {
      expect(mocks.addLifepathProposal).toHaveBeenCalledWith(
        expect.any(Y.Doc),
        expect.objectContaining({ title: 'Stowaway mystery', status: 'accepted' }),
      );
    });
    expect(generate).toHaveBeenCalledWith(mockCharacter, undefined, true);
  });

  it('resolves persisted proposals when the player accepts or rejects', () => {
    vi.mocked(useLifepathProposals).mockReturnValue([
      {
        id: 'proposal-1',
        type: 'plot-hook',
        targetTerm: 1,
        title: 'Stowaway mystery',
        description: 'A stowaway appears in term 1.',
        status: 'pending',
        generatedAt: 1,
      },
      {
        id: 'proposal-2',
        type: 'coherence-edit',
        targetTerm: 1,
        title: 'Fix term coherence',
        description: 'The event contradicts prior skills.',
        status: 'pending',
        generatedAt: 1,
      },
    ]);
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);
    fireEvent.click(screen.getAllByRole('button', { name: /Accept/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /Reject/i })[1]);

    expect(mocks.resolveLifepathProposal).toHaveBeenCalledWith(
      expect.any(Y.Doc),
      'proposal-1',
      true,
    );
    expect(mocks.resolveLifepathProposal).toHaveBeenCalledWith(
      expect.any(Y.Doc),
      'proposal-2',
      false,
    );
  });

  it('shows the up-to-date button label after reviewing an unchanged character', async () => {
    const generate = vi.fn().mockResolvedValue([]);
    vi.mocked(useLifepathReview).mockReturnValue({
      generate,
      isLoading: false,
      error: null,
      unavailable: false,
    });

    const { rerender } = render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    const button = screen.getByRole('button', { name: /Review Lifepath/i });
    expect(button.textContent).toBe('Review Lifepath');

    await act(async () => {
      fireEvent.click(button);
    });

    const lastReviewedFingerprint = JSON.stringify({
      terms: mockCharacter.terms,
      skills: mockCharacter.skills,
      chapters: mockCharacter.chapters,
    });
    vi.mocked(useCharacter).mockReturnValue({
      ...mockCharacter,
      reviewVersion: 1,
      lastReviewedFingerprint,
    });
    rerender(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    expect(screen.getByRole('button', { name: /up to date/i })).toBeTruthy();

    expect(generate).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /up to date/i }));
    });

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while the lifepath review is loading', async () => {
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: true,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    expect(screen.getByText('Analyzing lifepath...')).toBeTruthy();
  });

  it('hides proposal text in strict mode for non-GM players', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: { ...mockSession, settings: { ...mockSession.settings, gmApprovalMode: 'strict' } },
      settings: { ...mockSession.settings, gmApprovalMode: 'strict' },
      pendingRequests: [],
      actions: {
        updateSettings: vi.fn(),
        toggleCareer: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
        endSession: vi.fn(),
        exportAllCharacters: vi.fn(),
      },
    });
    vi.mocked(useLifepathProposals).mockReturnValue([
      {
        id: 'proposal-1',
        type: 'plot-hook',
        targetTerm: 1,
        title: 'Stowaway mystery',
        description: 'A stowaway appears in term 1.',
        status: 'pending',
        generatedAt: 1,
      },
    ]);
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    // Type badge visible
    expect(screen.getByText('Hook')).toBeTruthy();
    // Title visible
    expect(screen.getByText('Stowaway mystery')).toBeTruthy();
    // Description hidden, placeholder shown
    expect(screen.queryByText('A stowaway appears in term 1.')).toBeNull();
    expect(screen.getByText('Pending GM Review...')).toBeTruthy();
  });

  it('shows proposal text in lenient mode', () => {
    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: { ...mockSession, settings: { ...mockSession.settings, gmApprovalMode: 'lenient' } },
      settings: { ...mockSession.settings, gmApprovalMode: 'lenient' },
      pendingRequests: [],
      actions: {
        updateSettings: vi.fn(),
        toggleCareer: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
        endSession: vi.fn(),
        exportAllCharacters: vi.fn(),
      },
    });
    vi.mocked(useLifepathProposals).mockReturnValue([
      {
        id: 'proposal-1',
        type: 'plot-hook',
        targetTerm: 1,
        title: 'Stowaway mystery',
        description: 'A stowaway appears in term 1.',
        status: 'pending',
        generatedAt: 1,
      },
    ]);
    vi.mocked(useLifepathReview).mockReturnValue({
      generate: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });

    render(<FinalizeStep characterId="char-1" currentUserId="player-1" />);

    // Type badge visible
    expect(screen.getByText('Hook')).toBeTruthy();
    // Description visible
    expect(screen.getByText('A stowaway appears in term 1.')).toBeTruthy();
    // No placeholder
    expect(screen.queryByText('Pending GM Review...')).toBeNull();
  });
});
