import { useState, useEffect, useMemo } from 'react';
import { getProvider } from '../sync';
import { useAllCharacters, useSession } from './hooks';
import type { ChargenCharacter, ChargenSessionConfig } from './types';

export interface ChargenAwarenessState {
  characterName?: string;
  career?: string;
  assignment?: string;
  term?: number;
  step?: string;
  progressPercent?: number;
}

export interface Participant {
  userId: string;
  character: ChargenCharacter | null;
  awareness: ChargenAwarenessState | null;
  isGM: boolean;
  isOnline: boolean;
}

export function useParticipants(): Participant[] {
  const characters = useAllCharacters();
  const session = useSession();
  const [awarenessStates, setAwarenessStates] = useState<Map<number, ChargenAwarenessState>>(new Map());
  
  useEffect(() => {
    const provider = getProvider();
    if (!provider?.awareness) return;
    
    const handleChange = () => {
      const states = new Map<number, ChargenAwarenessState>();
      provider.awareness?.getStates().forEach((state, clientId) => {
        if (state?.chargen) {
          states.set(clientId, state.chargen as ChargenAwarenessState);
        }
      });
      setAwarenessStates(states);
    };
    
    provider.awareness?.on('change', handleChange);
    handleChange(); // Initial load
    
    return () => {
      provider.awareness?.off('change', handleChange);
    };
  }, []);
  
  return useMemo(() => {
    const participants: Participant[] = [];
    
    // Add GM if session exists
    if (session) {
      const gmCharacter = characters.find(c => c.playerId === session.createdBy);
      participants.push({
        userId: session.createdBy,
        character: gmCharacter || null,
        awareness: null,
        isGM: true,
        isOnline: true, // TODO: check awareness
      });
    }
    
    // Add players (excluding GM)
    characters.forEach(char => {
      if (session && char.playerId === session.createdBy) return; // Skip GM, already added
      
      participants.push({
        userId: char.playerId,
        character: char,
        awareness: null, // TODO: match by userId from awareness
        isGM: false,
        isOnline: true,
      });
    });
    
    return participants;
  }, [characters, session, awarenessStates]);
}

export function useUpdateChargenAwareness() {
  const update = (state: Partial<ChargenAwarenessState>) => {
    const provider = getProvider();
    if (!provider?.awareness) return;
    
    const currentState = provider.awareness.getLocalState() || {};
    provider.awareness.setLocalStateField('chargen', {
      ...(currentState.chargen || {}),
      ...state,
    });
  };
  
  return update;
}
