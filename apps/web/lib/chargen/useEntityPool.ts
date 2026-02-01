import { useState, useMemo } from 'react';
import { useEntityPool as useEntityPoolBase, useAllCharacters } from './hooks';
import type { SharedSpawnedEntity } from './types';

export type EntityTypeFilter = 'all' | 'npc' | 'location' | 'item' | 'secret';

export interface UseEntityPoolOptions {
  filterByType?: EntityTypeFilter;
  filterByCreator?: string;  // Character ID
}

export interface EntityWithMeta extends SharedSpawnedEntity {
  creatorName: string;
  claimerNames: string[];
}

export function useEntityPoolWithMeta(options: UseEntityPoolOptions = {}): {
  entities: EntityWithMeta[];
  filter: EntityTypeFilter;
  setFilter: (filter: EntityTypeFilter) => void;
  getEntityById: (id: string) => EntityWithMeta | undefined;
} {
  const baseEntities = useEntityPoolBase();
  const characters = useAllCharacters();
  const [filter, setFilter] = useState<EntityTypeFilter>(options.filterByType || 'all');

  const charMap = useMemo(() => {
    return characters.reduce((acc, char) => {
      acc[char.id] = char.name || 'Unnamed';
      return acc;
    }, {} as Record<string, string>);
  }, [characters]);

  const entitiesWithMeta = useMemo((): EntityWithMeta[] => {
    return baseEntities.map(entity => ({
      ...entity,
      creatorName: charMap[entity.createdFor] || 'Unknown',
      claimerNames: entity.claimedBy.map(id => charMap[id] || 'Unknown'),
    }));
  }, [baseEntities, charMap]);

  const filteredEntities = useMemo(() => {
    let result = entitiesWithMeta;
    
    if (filter !== 'all') {
      result = result.filter(e => e.type === filter);
    }
    
    if (options.filterByCreator) {
      result = result.filter(e => e.createdFor === options.filterByCreator);
    }
    
    return result;
  }, [entitiesWithMeta, filter, options.filterByCreator]);

  const getEntityById = (id: string): EntityWithMeta | undefined => {
    return entitiesWithMeta.find(e => e.id === id);
  };

  return {
    entities: filteredEntities,
    filter,
    setFilter,
    getEntityById,
  };
}

// Re-export the base hook for convenience
export { useEntityPool } from './hooks';
