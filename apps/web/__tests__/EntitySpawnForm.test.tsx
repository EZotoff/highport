import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventSpawn } from '@highport/mgt2e';
import EntitySpawnForm from '../components/chargen/EntitySpawnForm';

vi.mock('../lib/chargen/useGMControls', () => ({
  useGMControls: vi.fn(),
}));

vi.mock('../lib/chargen/useNarrative', () => ({
  useNPCNarrative: vi.fn(),
  useNarrativeAvailable: vi.fn(),
}));

vi.mock('../lib/chargen/hooks', () => ({
  useSession: vi.fn(),
}));

vi.mock('../lib/portrait/usePortrait', () => ({
  usePortraitGenerator: vi.fn(),
  attachPortraitRecord: vi.fn(),
  attachPortraitToNode: vi.fn(),
}));

vi.mock('@/components/portrait/PortraitLibrary', () => ({
  PortraitLibrary: () => null,
}));

vi.mock('@/components/portrait/PortraitRemixer', () => ({
  PortraitRemixer: () => null,
}));

vi.mock('@/components/portrait/PortraitGenerationProgress', () => ({
  default: () => null,
}));

import { useGMControls } from '../lib/chargen/useGMControls';
import { useNPCNarrative, useNarrativeAvailable } from '../lib/chargen/useNarrative';
import { useSession } from '../lib/chargen/hooks';
import { usePortraitGenerator } from '../lib/portrait/usePortrait';

const spawn: EventSpawn = { type: 'npc', relationship: 'ally', required: false };

describe('EntitySpawnForm', () => {
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

    vi.mocked(useGMControls).mockReturnValue({
      isGM: false,
      session: null,
      settings: {
        allowedCareers: [],
        aiVerbosity: 'inspiration',
        isLocked: false,
        gmApprovalMode: 'strict',
        crossCharacterLinkMode: 'gm-mediated',
      },
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

    vi.mocked(useSession).mockReturnValue(null);

    vi.mocked(useNarrativeAvailable).mockReturnValue({
      isAvailable: true,
      isChecking: false,
    });

    vi.mocked(usePortraitGenerator).mockReturnValue({
      generate: vi.fn(),
      remix: vi.fn(),
      isLoading: false,
      error: null,
      unavailable: false,
    });
  });

  it('disables the Add button when the generated NPC name is pending GM review in strict mode', async () => {
    const generate = vi.fn().mockResolvedValue({ name: 'AI-generated Ally' });
    vi.mocked(useNPCNarrative).mockReturnValue({
      generate,
      result: null,
      isLoading: false,
      error: null,
      unavailable: false,
      reset: vi.fn(),
    });

    render(
      <EntitySpawnForm
        spawn={spawn}
        characterId="char-1"
        termNumber={1}
        eventRoll={6}
        onComplete={vi.fn()}
        onSkip={vi.fn()}
        verbosity="inspiration"
        career="navy"
        characterName="Test Hero"
        currentUserId="player-1"
      />,
    );

    const nameInput = screen.getByRole('textbox', { name: /Name/i });
    fireEvent.change(nameInput, { target: { value: 'Manual Name' } });

    const addButtonBefore = screen.getByRole('button', { name: /Add to Campaign Graph/i });
    expect(addButtonBefore.hasAttribute('disabled')).toBe(false);

    const aiButton = screen.getByRole('button', { name: '✨ AI' });
    fireEvent.click(aiButton);

    await waitFor(() => {
      const addButtonAfter = screen.getByRole('button', { name: /Add to Campaign Graph/i });
      expect(addButtonAfter.hasAttribute('disabled')).toBe(true);
    });

    expect(screen.getByText('Pending GM Approval')).toBeTruthy();

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        npcType: 'ally',
        verbosity: 'inspiration',
      }),
    );
  });
});
