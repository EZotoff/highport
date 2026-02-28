import { useState, useCallback, useEffect } from 'react';
import * as narrativeApi from './narrative';
import type {
  VerbosityLevel,
  EventDescriptionResult,
  NPCDetails,
  CharacterContext,
  NPCContext,
} from './narrative';

export function useEventNarrative() {
  const [result, setResult] = useState<EventDescriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (params: {
      eventText: string;
      career: string;
      assignment: string;
      term: number;
      characterContext: CharacterContext;
      verbosity: VerbosityLevel;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await narrativeApi.generateEventDescription(params);
        setResult(data);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
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
  }, []);

  return { generate, result, isLoading, error, reset };
}

export function useNPCNarrative() {
  const [result, setResult] = useState<NPCDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (params: {
      npcType: string;
      context: NPCContext;
      existingFields?: Partial<NPCDetails>;
      verbosity: VerbosityLevel;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await narrativeApi.generateNPCDetails(params);
        setResult(data);
        return data;
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Generation failed');
        setError(err);
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
  }, []);

  return { generate, result, isLoading, error, reset };
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
