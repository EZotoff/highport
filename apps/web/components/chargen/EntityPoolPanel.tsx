'use client';

import React, { useState, useMemo } from 'react';
import { User, MapPin, Package, Lock, HelpCircle } from 'lucide-react';
import { SciFiButton } from '@/components/ui/scifi';
import { useEntityPool, useAllCharacters } from '../../lib/chargen/hooks';
import type { SharedSpawnedEntity } from '../../lib/chargen/types';

interface EntityPoolPanelProps {
  currentCharId?: string;
  onRequestConnection?: (entityId: string) => void;
  onViewDetails?: (entityId: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  npc: <User className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  item: <Package className="w-4 h-4" />,
  secret: <Lock className="w-4 h-4" />,
};

const getTypeIcon = (type: string) => TYPE_ICONS[type] ?? <HelpCircle className="w-4 h-4" />;

const RELATIONSHIP_COLORS: Record<string, string> = {
  ally: 'text-green-400',
  contact: 'text-blue-400',
  rival: 'text-amber-400',
  enemy: 'text-red-400',
};

export function EntityPoolPanel({
  currentCharId,
  onRequestConnection,
  onViewDetails,
}: EntityPoolPanelProps) {
  const entities = useEntityPool();
  const characters = useAllCharacters();
  const [filter, setFilter] = useState<string>('all');

  const charMap = useMemo(() => {
    return characters.reduce(
      (acc, char) => {
        acc[char.id] = char.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [characters]);

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
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
        <h2
          className="text-heading font-bold text-sm uppercase tracking-wider mb-3"
          data-testid="entity-pool"
        >
          Spawned Entities
        </h2>

        <div className="flex flex-wrap gap-2">
          {['all', 'npc', 'location', 'item', 'secret'].map((type) => (
            <SciFiButton
              key={type}
              onClick={() => setFilter(type)}
              size="sm"
              theme={filter === type ? 'cyan' : 'slate'}
              scifiVariant={filter === type ? 'outline' : 'ghost'}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
            </SciFiButton>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {filteredEntities.length === 0 ? (
          <div className="h-full flex items-center justify-center text-subtle text-sm italic">
            No entities spawned yet
          </div>
        ) : (
          filteredEntities.map((entity) => {
            const relationship = getRelationship(entity);
            const isClaimedByCurrent = currentCharId && entity.claimedBy.includes(currentCharId);
            const isClaimed = entity.claimedBy.length > 0;
            const relationshipColor =
              relationship && RELATIONSHIP_COLORS[relationship]
                ? RELATIONSHIP_COLORS[relationship]
                : 'text-subtle';

            return (
              <div
                key={entity.id}
                className="bg-zinc-950 border border-zinc-800 rounded p-3 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="text-subtle">{getTypeIcon(entity.type)}</div>
                    <div>
                      <h3 className="text-default font-semibold text-sm">
                        {entity.name}
                        <span className="ml-2 text-subtle text-xs font-normal capitalize">
                          ({entity.type})
                        </span>
                      </h3>
                    </div>
                  </div>
                </div>

                {entity.type === 'npc' && relationship && (
                  <div className={`text-xs ${relationshipColor} mb-1 font-medium`}>
                    {relationship.charAt(0).toUpperCase() + relationship.slice(1)} of{' '}
                    {getCreatorName(entity)}
                  </div>
                )}

                <div className="text-xs text-subtle mb-2">
                  Created by: {getCreatorName(entity)} (Term {entity.createdDuring.termNumber})
                </div>

                <div className="h-px bg-zinc-800 my-2" />

                {entity.description && (
                  <p className="text-subtle text-xs mb-3 line-clamp-2">"{entity.description}"</p>
                )}

                {isClaimed && (
                  <div className="text-xs text-subtle mb-3 flex flex-wrap gap-1">
                    <span>Connection claimed by:</span>
                    {entity.claimedBy.map((claimerId, idx) => (
                      <span key={claimerId} className="text-label">
                        {charMap[claimerId] || 'Unknown'}
                        {claimerId === currentCharId ? ' ✓' : ''}
                        {idx < entity.claimedBy.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  {currentCharId && !isClaimedByCurrent && onRequestConnection && (
                    <SciFiButton
                      onClick={() => onRequestConnection(entity.id)}
                      theme="violet"
                      scifiVariant="outline"
                      size="sm"
                    >
                      Request Connection
                    </SciFiButton>
                  )}
                  {onViewDetails && (
                    <SciFiButton
                      onClick={() => onViewDetails(entity.id)}
                      theme="slate"
                      scifiVariant="ghost"
                      size="sm"
                    >
                      View Details
                    </SciFiButton>
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
