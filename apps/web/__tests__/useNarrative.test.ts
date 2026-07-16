import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as Y from 'yjs';
import { useEventNarrative, useNPCNarrative, useCrossCharacterLinks, useLifepathReview } from '../lib/chargen/useNarrative';
import { RagUnavailableError } from '../lib/rag-client';
import type { EventDescriptionResult, NPCDetails } from '../lib/chargen/narrative';

// Mock the narrative module
vi.mock('../lib/chargen/narrative', () => ({
  generateEventDescription: vi.fn(),
  generateNPCDetails: vi.fn(),
  generateCrossCharacterLinks: vi.fn(),
  generateLifepathReview: vi.fn(),
  checkNarrativeAvailable: vi.fn(),
}));

vi.mock('../lib/chargen/hooks', () => ({
  useAllCharacters: vi.fn(),
}));

vi.mock('../lib/chargen/state', () => ({
  addCrossCharacterLink: vi.fn(),
  getCrossCharacterLinks: vi.fn(() => []),
}));

vi.mock('../lib/ydoc', () => ({
  getYDoc: vi.fn(),
}));

import * as narrativeApi from '../lib/chargen/narrative';
import { useAllCharacters } from '../lib/chargen/hooks';
import { addCrossCharacterLink, getCrossCharacterLinks } from '../lib/chargen/state';
import { getYDoc } from '../lib/ydoc';
import type { ChargenCharacter, CrossCharacterLinkProposal, LifepathProposal } from '../lib/chargen/types';

describe('useEventNarrative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const eventParams = {
    eventText: 'You make a rival',
    career: 'navy',
    assignment: 'line_crew',
    term: 1,
    characterContext: { name: 'Test', characteristics: {} },
    verbosity: 'inspiration' as const,
  };

  it('should return result on successful generation', async () => {
    const mockResult: EventDescriptionResult = {
      description: 'A tense moment...',
      suggestedEntities: [],
    };
    vi.mocked(narrativeApi.generateEventDescription).mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useEventNarrative());

    let returned: EventDescriptionResult | undefined;
    await act(async () => {
      returned = await result.current.generate(eventParams);
    });

    expect(returned).toEqual(mockResult);
    expect(result.current.result).toEqual(mockResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.unavailable).toBe(false);
  });

  it('should set unavailable=true when narrative throws RagUnavailableError', async () => {
    const ragError = new RagUnavailableError('RAG service unreachable');
    vi.mocked(narrativeApi.generateEventDescription).mockRejectedValueOnce(ragError);

    const { result } = renderHook(() => useEventNarrative());

    await act(async () => {
      try {
        await result.current.generate(eventParams);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBe(ragError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should not set unavailable when narrative throws a generic Error', async () => {
    const genericError = new Error('Something went wrong');
    vi.mocked(narrativeApi.generateEventDescription).mockRejectedValueOnce(genericError);

    const { result } = renderHook(() => useEventNarrative());

    await act(async () => {
      try {
        await result.current.generate(eventParams);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBe(genericError);
  });

  it('should reset unavailable on reset()', async () => {
    const ragError = new RagUnavailableError('RAG service unreachable');
    vi.mocked(narrativeApi.generateEventDescription).mockRejectedValueOnce(ragError);

    const { result } = renderHook(() => useEventNarrative());

    await act(async () => {
      try {
        await result.current.generate(eventParams);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useNPCNarrative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const npcParams = {
    npcType: 'rival',
    context: {
      eventText: 'You make a rival',
      career: 'navy',
      characterName: 'Test',
    },
    verbosity: 'full' as const,
  };

  it('should return result on successful generation', async () => {
    const mockResult: NPCDetails = {
      name: 'Lt. Cmdr Vasquez',
      personality: 'Cold',
      motivation: 'Revenge',
    };
    vi.mocked(narrativeApi.generateNPCDetails).mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useNPCNarrative());

    let returned: NPCDetails | undefined;
    await act(async () => {
      returned = await result.current.generate(npcParams);
    });

    expect(returned).toEqual(mockResult);
    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set unavailable=true when narrative throws RagUnavailableError', async () => {
    const ragError = new RagUnavailableError('RAG service unavailable (500)');
    vi.mocked(narrativeApi.generateNPCDetails).mockRejectedValueOnce(ragError);

    const { result } = renderHook(() => useNPCNarrative());

    await act(async () => {
      try {
        await result.current.generate(npcParams);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBe(ragError);
  });

  it('should not set unavailable when narrative throws a generic Error', async () => {
    const genericError = new Error('Validation failed');
    vi.mocked(narrativeApi.generateNPCDetails).mockRejectedValueOnce(genericError);

    const { result } = renderHook(() => useNPCNarrative());

    await act(async () => {
      try {
        await result.current.generate(npcParams);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBe(genericError);
  });
});
describe('useCrossCharacterLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCharacters: ChargenCharacter[] = [
    {
      id: 'char-1',
      playerId: 'player-1',
      name: 'Zara',
      characteristics: { STR: 7, DEX: 9, END: 8, INT: 10, EDU: 7, SOC: 8 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'finalized',
      skills: {},
      benefits: [],
      credits: 0,
      age: 34,
      spawnedEntityIds: [],
    },
    {
      id: 'char-2',
      playerId: 'player-2',
      name: 'Milo',
      characteristics: { STR: 8, DEX: 8, END: 9, INT: 9, EDU: 8, SOC: 7 },
      backgroundSkills: [],
      terms: [],
      chapters: [],
      currentTermIndex: 0,
      status: 'finalized',
      skills: {},
      benefits: [],
      credits: 0,
      age: 30,
      spawnedEntityIds: [],
    },
  ];

  const mockProposal: CrossCharacterLinkProposal = {
    id: 'link-1',
    sourceCharId: 'char-1',
    targetCharId: 'char-2',
    sourceEntityId: 'entity-1',
    targetEntityId: 'entity-2',
    relationship: 'former shipmates',
    description: 'Served together on a merchant vessel',
    status: 'pending',
    generatedAt: 1234567890,
  };

  it('should not auto-fire on mount', () => {
    vi.mocked(useAllCharacters).mockReturnValue(mockCharacters);
    vi.mocked(narrativeApi.generateCrossCharacterLinks).mockResolvedValue([]);

    const { result } = renderHook(() => useCrossCharacterLinks(true));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(narrativeApi.generateCrossCharacterLinks).not.toHaveBeenCalled();
  });

  it('should refresh and update proposals', async () => {
    const doc = new Y.Doc();
    vi.mocked(getYDoc).mockReturnValue(doc);
    vi.mocked(useAllCharacters).mockReturnValue(mockCharacters);
    vi.mocked(narrativeApi.generateCrossCharacterLinks).mockResolvedValueOnce([mockProposal]);

    const { result } = renderHook(() => useCrossCharacterLinks(true));

    await act(async () => {
      await result.current.refresh();
    });

    expect(narrativeApi.generateCrossCharacterLinks).toHaveBeenCalledWith(
      mockCharacters,
      expect.any(Array),
      true,
    );
    expect(addCrossCharacterLink).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        sourceCharId: 'char-1',
        targetCharId: 'char-2',
        relationship: 'former shipmates',
      })
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set error string on failure', async () => {
    vi.mocked(useAllCharacters).mockReturnValue(mockCharacters);
    vi.mocked(narrativeApi.generateCrossCharacterLinks).mockRejectedValueOnce(new Error('Boom'));

    const { result } = renderHook(() => useCrossCharacterLinks());

    await act(async () => {
      try {
        await result.current.refresh();
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.error).toBe('Boom');
    expect(result.current.isLoading).toBe(false);
  });
});
describe('useLifepathReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCharacter: ChargenCharacter = {
    id: 'char-1',
    playerId: 'player-1',
    name: 'Zara',
    characteristics: { STR: 7, DEX: 9, END: 8, INT: 10, EDU: 7, SOC: 8 },
    backgroundSkills: [],
    terms: [],
    chapters: [],
    currentTermIndex: 0,
    status: 'mustering_out',
    skills: {},
    benefits: [],
    credits: 0,
    age: 22,
    spawnedEntityIds: [],
  };

  const mockProposal: LifepathProposal = {
    id: 'lp-1',
    type: 'plot-hook',
    targetTerm: 1,
    title: 'Stowaway mystery',
    description: 'A stowaway appears in term 1.',
    status: 'pending',
    generatedAt: 1234567890,
  };

  it('should return proposals on successful generation', async () => {
    vi.mocked(narrativeApi.generateLifepathReview).mockResolvedValueOnce([mockProposal]);

    const { result } = renderHook(() => useLifepathReview());

    let returned: LifepathProposal[] | undefined;
    await act(async () => {
      returned = await result.current.generate(mockCharacter, undefined, true);
    });

    expect(returned).toEqual([mockProposal]);
    expect(narrativeApi.generateLifepathReview).toHaveBeenCalledWith(mockCharacter, undefined, true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.unavailable).toBe(false);
  });

  it('should set unavailable=true when narrative throws RagUnavailableError', async () => {
    const ragError = new RagUnavailableError('RAG service unreachable');
    vi.mocked(narrativeApi.generateLifepathReview).mockRejectedValueOnce(ragError);

    const { result } = renderHook(() => useLifepathReview());

    await act(async () => {
      try {
        await result.current.generate(mockCharacter);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(true);
    expect(result.current.error).toBe(ragError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should not set unavailable when narrative throws a generic Error', async () => {
    const genericError = new Error('Validation failed');
    vi.mocked(narrativeApi.generateLifepathReview).mockRejectedValueOnce(genericError);

    const { result } = renderHook(() => useLifepathReview());

    await act(async () => {
      try {
        await result.current.generate(mockCharacter);
      } catch (_) {
        // Expected
      }
    });

    expect(result.current.unavailable).toBe(false);
    expect(result.current.error).toBe(genericError);
  });
});
