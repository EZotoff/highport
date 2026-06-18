import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventNarrative, useNPCNarrative } from '../lib/chargen/useNarrative';
import { RagUnavailableError } from '../lib/rag-client';
import type { EventDescriptionResult, NPCDetails } from '../lib/chargen/narrative';

// Mock the narrative module
vi.mock('../lib/chargen/narrative', () => ({
  generateEventDescription: vi.fn(),
  generateNPCDetails: vi.fn(),
  checkNarrativeAvailable: vi.fn(),
}));

import * as narrativeApi from '../lib/chargen/narrative';

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
    verbosity: 'structured' as const,
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
    verbosity: 'rich' as const,
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
