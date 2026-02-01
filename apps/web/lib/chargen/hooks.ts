import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { getYDoc } from '../ydoc';
import { 
  getCharactersMap, 
  createCharacter, 
  updateCharacter,
  yMapToCharacter,
  getSession,
  getSessionMap,
  getEntityPool,
  getEntityPoolMap,
  getConnectionRequests,
  getConnectionRequestsArray 
} from './state';
import type { 
  ChargenCharacter, 
  ChargenSessionConfig, 
  SharedSpawnedEntity, 
  ConnectionRequest 
} from './types';

export function useCharacter(charId: string | null): ChargenCharacter | null {
  const [character, setCharacter] = useState<ChargenCharacter | null>(null);
  
  useEffect(() => {
    if (!charId) {
      setCharacter(null);
      return;
    }
    
    const doc = getYDoc();
    const characters = getCharactersMap(doc);
    
    const charMap = characters.get(charId);
    if (charMap) {
      setCharacter(yMapToCharacter(charMap as Y.Map<unknown>));
    }
    
    const observer = () => {
      const charMap = characters.get(charId);
      if (charMap) {
        setCharacter(yMapToCharacter(charMap as Y.Map<unknown>));
      } else {
        setCharacter(null);
      }
    };
    
    characters.observeDeep(observer);
    
    return () => {
      characters.unobserveDeep(observer);
    };
  }, [charId]);
  
  return character;
}

export function useAllCharacters(): ChargenCharacter[] {
  const [characters, setCharacters] = useState<ChargenCharacter[]>([]);
  
  useEffect(() => {
    const doc = getYDoc();
    const charactersMap = getCharactersMap(doc);
    
    const updateCharacters = () => {
      const result: ChargenCharacter[] = [];
      charactersMap.forEach((charMap) => {
        result.push(yMapToCharacter(charMap as Y.Map<unknown>));
      });
      setCharacters(result);
    };
    
    updateCharacters();
    charactersMap.observeDeep(updateCharacters);
    
    return () => {
      charactersMap.unobserveDeep(updateCharacters);
    };
  }, []);
  
  return characters;
}

export function useChargenActions() {
  const doc = getYDoc();
  
  const create = useCallback((playerId: string, name?: string): string => {
    return createCharacter(doc, playerId, name);
  }, [doc]);
  
  const update = useCallback(<K extends keyof ChargenCharacter>(
    charId: string,
    field: K,
    value: ChargenCharacter[K]
  ): void => {
    updateCharacter(doc, charId, field, value);
  }, [doc]);
  
  return { create, update };
}

// ============================================
// Session Hooks (Phase 4)
// ============================================

export function useSession(): ChargenSessionConfig | null {
  const [session, setSession] = useState<ChargenSessionConfig | null>(null);
  
  useEffect(() => {
    const doc = getYDoc();
    const sessionMap = getSessionMap(doc);
    
    const updateSession = () => {
      setSession(getSession(doc));
    };
    
    updateSession();
    sessionMap.observeDeep(updateSession);
    
    return () => {
      sessionMap.unobserveDeep(updateSession);
    };
  }, []);
  
  return session;
}

export function useEntityPool(): SharedSpawnedEntity[] {
  const [entities, setEntities] = useState<SharedSpawnedEntity[]>([]);
  
  useEffect(() => {
    const doc = getYDoc();
    const entityPoolMap = getEntityPoolMap(doc);
    
    const updateEntities = () => {
      setEntities(getEntityPool(doc));
    };
    
    updateEntities();
    entityPoolMap.observeDeep(updateEntities);
    
    return () => {
      entityPoolMap.unobserveDeep(updateEntities);
    };
  }, []);
  
  return entities;
}

export function useConnectionRequests(): ConnectionRequest[] {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  
  useEffect(() => {
    const doc = getYDoc();
    const requestsArray = getConnectionRequestsArray(doc);
    
    const updateRequests = () => {
      setRequests(getConnectionRequests(doc));
    };
    
    updateRequests();
    requestsArray.observeDeep(updateRequests);
    
    return () => {
      requestsArray.unobserveDeep(updateRequests);
    };
  }, []);
  
  return requests;
}

export function useSessionParticipants(): Array<{ character: ChargenCharacter; userId: string }> {
  const characters = useAllCharacters();
  
  return useMemo(() => {
    return characters.map(char => ({
      character: char,
      userId: char.playerId,
    }));
  }, [characters]);
}
