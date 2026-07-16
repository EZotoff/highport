import { useState, useCallback, useEffect } from 'react';
import * as narrativeApi from './narrative';
import { useAllCharacters } from './hooks';
import { addCrossCharacterLink, getCrossCharacterLinks } from './state';
import { getYDoc } from '../ydoc';
import { findSharedHistory } from '../graph/shared-history';
import type { ChargenCharacter } from './types';
import type {
  VerbosityLevel,
  EventDescriptionResult,
  NPCDetails,
  MishapDescriptionResult,
  CharacterContext,
  NPCContext,
} from './narrative';


export function useEventNarrative() {
  const [result, setResult] = useState<EventDescriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const generate = useCallback(
    async (params: {
      eventText: string;
      career: string;
      assignment: string;
      term: number;
      characterContext: CharacterContext;
      verbosity: VerbosityLevel;
      guidance?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      setUnavailable(false);
      try {
        const data = await narrativeApi.generateEventDescription(params);
        setResult(data);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
        if (err.name === 'RagUnavailableError') {
          setUnavailable(true);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setUnavailable(false);
  }, []);

  return { generate, result, isLoading, error, unavailable, reset };
}

export function useNPCNarrative() {
  const [result, setResult] = useState<NPCDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const generate = useCallback(
    async (params: {
      npcType: string;
      context: NPCContext;
      existingFields?: Partial<NPCDetails>;
      verbosity: VerbosityLevel;
    }) => {
      setIsLoading(true);
      setError(null);
      setUnavailable(false);
      try {
        const data = await narrativeApi.generateNPCDetails(params);
        setResult(data);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
        if (err.name === 'RagUnavailableError') {
          setUnavailable(true);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setUnavailable(false);
  }, []);

  return { generate, result, isLoading, error, unavailable, reset };
}


export function useMishapNarrative() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const generate = useCallback(
    async (params: {
      mishapText: string;
      career: string;
      term: number;
      characterContext: CharacterContext;
      verbosity: VerbosityLevel;
      guidance?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      setUnavailable(false);
      try {
        const data = await narrativeApi.generateMishapDescription(params);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
        if (err.name === 'RagUnavailableError') {
          setUnavailable(true);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { generate, isLoading, error, unavailable };
}

export function useNarrativeAvailable() {
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      setIsChecking(true);
      const result = await narrativeApi.checkNarrativeAvailable();
      if (mounted) {
        setIsAvailable(result);
        setIsChecking(false);
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  return { isAvailable, isChecking };
}

export function useCrossCharacterLinks(isGM = false) {
  const characters = useAllCharacters();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const doc = getYDoc();
      const sharedHistory = findSharedHistory(characters);
      const generated = await narrativeApi.generateCrossCharacterLinks(characters, sharedHistory, isGM);

      // Dedup: skip proposals already in Yjs (matched by source+target+relationship)
      const existing = getCrossCharacterLinks(doc);
      const existingKeys = new Set(
        existing.map(l => `${l.sourceCharId}|${l.targetCharId}|${l.relationship}`)
      );

      for (const proposal of generated) {
        const dedupKey = `${proposal.sourceCharId}|${proposal.targetCharId}|${proposal.relationship}`;
        if (!existingKeys.has(dedupKey)) {
          addCrossCharacterLink(doc, {
            sourceCharId: proposal.sourceCharId,
            targetCharId: proposal.targetCharId,
            relationship: proposal.relationship,
            description: proposal.description,
            sourceEntityId: proposal.sourceEntityId,
            targetEntityId: proposal.targetEntityId,
          });
          existingKeys.add(dedupKey);
        }
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Generation failed');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [characters, isGM]);

  return { isLoading, error, refresh };
}
export function useLifepathReview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const generate = useCallback(
    async (character: ChargenCharacter, campaignContext?: string[], isGM = false) => {
      setIsLoading(true);
      setError(null);
      setUnavailable(false);
      try {
        const data = await narrativeApi.generateLifepathReview(character, campaignContext, isGM);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
        if (err.name === 'RagUnavailableError') {
          setUnavailable(true);
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { generate, isLoading, error, unavailable };
}
