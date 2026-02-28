import { useState, useEffect, useMemo } from 'react';
import { useAllCharacters } from '../chargen/hooks';
import { getYDoc, getNodesMap } from '../ydoc';
import type { ChargenCharacter, CareerTermResult } from '../chargen/types';
import * as Y from 'yjs';

interface UseSelectedLifepathResult {
  character: ChargenCharacter | null;
  terms: CareerTermResult[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

/**
 * Hook that finds the character associated with a selected node
 * @param selectedNodeId - The currently selected graph node ID
 * @returns Character data if node is a character/traveller type
 */
export function useSelectedLifepath(selectedNodeId: string | null): UseSelectedLifepathResult {
  const [isOpen, setIsOpen] = useState(false);
  const allCharacters = useAllCharacters();
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  const character = useMemo(() => {
    if (!selectedNodeId) return null;

    const doc = getYDoc();
    const nodesMap = getNodesMap(doc);
    const nodeData = nodesMap.get(selectedNodeId);

    if (!nodeData) return null;

    const nodeMap = nodeData as Y.Map<unknown>;
    const type = nodeMap.get('type') as string;
    const isCharacterType = type === 'traveller' || type === 'npc';

    if (!isCharacterType) return null;

    const byId = allCharacters.find((c) => c.id === selectedNodeId);
    if (byId) return byId;

    const metadata = nodeMap.get('metadata') as Record<string, unknown> | undefined;
    const linkedCharId = metadata?.characterId as string | undefined;

    if (linkedCharId) {
      return allCharacters.find((c) => c.id === linkedCharId) || null;
    }

    return null;
  }, [selectedNodeId, allCharacters]);

  useEffect(() => {
    if (character && selectedNodeId !== currentNodeId) {
      setIsOpen(true);
      setCurrentNodeId(selectedNodeId);
    } else if (!character) {
      setIsOpen(false);
      setCurrentNodeId(null);
    }
  }, [character, selectedNodeId, currentNodeId]);

  return {
    character: character || null,
    terms: character?.terms || [],
    isOpen,
    setIsOpen,
  };
}
