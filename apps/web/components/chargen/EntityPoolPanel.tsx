'use client';

import React, { useState, useMemo } from 'react';
import { useEntityPool, useAllCharacters } from '../../lib/chargen/hooks';
import type { SharedSpawnedEntity } from '../../lib/chargen/types';

interface EntityPoolPanelProps {
  currentCharId?: string;
  onRequestConnection?: (entityId: string) => void;
  onViewDetails?: (entityId: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  npc: '👤',
  location: '📍',
  item: '📦',
  secret: '🔒',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  ally: 'text-green-400',
  contact: 'text-blue-400',
  rival: 'text-amber-400',
  enemy: 'text-red-400',
};

export function EntityPoolPanel({ 
  currentCharId, 
  onRequestConnection, 
  onViewDetails 
}: EntityPoolPanelProps) {
  const entities = useEntityPool();
  const characters = useAllCharacters();
  const [filter, setFilter] = useState<string>('all');

  const charMap = useMemo(() => {
    return characters.reduce((acc, char) => {
      acc[char.id] = char.name;
      return acc;
    }, {} as Record<string, string>);
  }, [characters]);

  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      if (filter === 'all') return true;
      return entity.type === filter;
    });
  }, [entities, filter]);

  const getRelationship = (entity: SharedSpawnedEntity) => {
    const rel = (entity.metadata as any)?.relationship as string | undefined;
    return rel;
  };

  const getCreatorName = (entity: SharedSpawnedEntity) => {
    return charMap[entity.createdFor] || 'Unknown';
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <h2 className="text-zinc-100 font-bold text-sm uppercase tracking-wider mb-3">
          Spawned Entities
        </h2>
        
        <div className="flex flex-wrap gap-2">
          {['all', 'npc', 'location', 'item', 'secret'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`
                px-3 py-1 text-xs rounded-full border transition-colors
                ${filter === type 
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium' 
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                }
              `}
            >
              {type === 'all' ? 'All' : (type.charAt(0).toUpperCase() + type.slice(1) + 's')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredEntities.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm italic">
            No entities spawned yet
          </div>
        ) : (
          filteredEntities.map((entity) => {
            const relationship = getRelationship(entity);
            const isClaimedByCurrent = currentCharId && entity.claimedBy.includes(currentCharId);
            const isClaimed = entity.claimedBy.length > 0;
            const relationshipColor = relationship && RELATIONSHIP_COLORS[relationship] 
              ? RELATIONSHIP_COLORS[relationship] 
              : 'text-zinc-400';

            return (
              <div 
                key={entity.id} 
                className="bg-zinc-950 border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" role="img" aria-label={entity.type}>
                      {TYPE_ICONS[entity.type] || '❓'}
                    </span>
                    <div>
                      <h3 className="text-zinc-200 font-semibold text-sm">
                        {entity.name}
                        <span className="ml-2 text-zinc-500 text-xs font-normal capitalize">
                          ({entity.type})
                        </span>
                      </h3>
                    </div>
                  </div>
                </div>

                {entity.type === 'npc' && relationship && (
                  <div className={`text-xs ${relationshipColor} mb-1 font-medium`}>
                    {relationship.charAt(0).toUpperCase() + relationship.slice(1)} of {getCreatorName(entity)}
                  </div>
                )}

                <div className="text-xs text-zinc-500 mb-2">
                  Created by: {getCreatorName(entity)} (Term {entity.createdDuring.termNumber})
                </div>

                <div className="h-px bg-zinc-800 my-2" />

                {entity.description && (
                  <p className="text-zinc-400 text-xs mb-3 line-clamp-2">
                    "{entity.description}"
                  </p>
                )}

                {isClaimed && (
                  <div className="text-xs text-zinc-400 mb-3 flex flex-wrap gap-1">
                    <span>Connection claimed by:</span>
                    {entity.claimedBy.map((claimerId, idx) => (
                      <span key={claimerId} className="text-zinc-300">
                        {charMap[claimerId] || 'Unknown'}
                        {claimerId === currentCharId ? ' ✓' : ''}
                        {idx < entity.claimedBy.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  {currentCharId && !isClaimedByCurrent && onRequestConnection && (
                    <button
                      onClick={() => onRequestConnection(entity.id)}
                      className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
                    >
                      Request Connection
                    </button>
                  )}
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(entity.id)}
                      className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
