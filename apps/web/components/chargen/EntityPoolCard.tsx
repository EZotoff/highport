'use client';

import React from 'react';
import type { SharedSpawnedEntity } from '../../lib/chargen/types';

interface EntityPoolCardProps {
  entity: SharedSpawnedEntity;
  creatorName?: string;
  claimerNames?: string[];
  isClaimedByCurrent?: boolean;
  onRequestConnection?: () => void;
  onViewDetails?: () => void;
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

export default function EntityPoolCard({
  entity,
  creatorName = 'Unknown',
  claimerNames = [],
  isClaimedByCurrent = false,
  onRequestConnection,
  onViewDetails,
}: EntityPoolCardProps) {
  const relationship = (entity.metadata as Record<string, unknown>)?.relationship as string | undefined;
  const relationshipColor = relationship && RELATIONSHIP_COLORS[relationship]
    ? RELATIONSHIP_COLORS[relationship]
    : 'text-zinc-400';
  const isClaimed = entity.claimedBy.length > 0;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
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
          {relationship.charAt(0).toUpperCase() + relationship.slice(1)} of {creatorName}
        </div>
      )}

      <div className="text-xs text-zinc-500 mb-2">
        Created by: {creatorName} (Term {entity.createdDuring.termNumber})
      </div>

      <div className="h-px bg-zinc-800 my-2" />

      {entity.description && (
        <p className="text-zinc-400 text-xs mb-3 line-clamp-2">
          "{entity.description}"
        </p>
      )}

      {isClaimed && (
        <div className="text-xs text-zinc-400 mb-3">
          Connection claimed by:{' '}
          {claimerNames.map((name, idx) => (
            <span key={idx} className="text-zinc-300">
              {name}
              {idx === claimerNames.length - 1 && isClaimedByCurrent ? ' ✓' : ''}
              {idx < claimerNames.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {!isClaimedByCurrent && onRequestConnection && (
          <button
            onClick={onRequestConnection}
            className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
          >
            Request Connection
          </button>
        )}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}
