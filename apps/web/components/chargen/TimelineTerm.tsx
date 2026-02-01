import React from 'react';
import { 
  User, MapPin, Package, FileKey, 
  Check, X, ChevronsUp 
} from 'lucide-react';
import type { CareerTermResult, SpawnedEntityRef } from '../../lib/chargen/types';
import { TimelineEvent } from './TimelineEvent';

interface TimelineTermProps {
  term: CareerTermResult;
  career: { id: string; name: string };
  onExpand: () => void;
  onEntityClick?: (entityId: string) => void;
}

export function TimelineTerm({ term, career, onExpand, onEntityClick }: TimelineTermProps) {
  const isMishap = !!term.mishap;
  const isAdvancement = term.advanced;
  const isCommission = term.commissioned;
  
  // Status color logic
  const statusColor = isMishap 
    ? 'border-red-500/50 bg-red-950/10' 
    : 'border-gray-700 bg-gray-800/50';

  return (
    <div 
      className={`
        flex flex-col w-[220px] shrink-0 rounded-lg border ${statusColor}
        hover:border-gray-500 transition-colors cursor-pointer group
      `}
      onClick={onExpand}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 font-mono">
            TERM {term.termNumber} • AGE {term.startAge}
          </span>
          <span className="font-semibold text-sm text-gray-200 truncate" title={career.name}>
            {career.name}
          </span>
        </div>
        
        <div className="flex gap-1">
          {term.survived ? (
            <div className="text-green-500" title="Survived">
              <Check className="w-4 h-4" />
            </div>
          ) : (
            <div className="text-red-500" title="Mishap">
              <X className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Body: Events & Stats */}
      <div className="p-2 flex-1 flex flex-col gap-2">
        {/* Rank / Advancement */}
        {(isAdvancement || isCommission || term.rankGained !== undefined) && (
          <div className="flex items-center gap-1 text-xs text-yellow-500 font-medium">
            <ChevronsUp className="w-3 h-3" />
            <span>
              {isCommission ? 'Commissioned' : 'Promoted'} 
              {term.currentRank > 0 && ` (Rank ${term.currentRank})`}
            </span>
          </div>
        )}

        {/* Event */}
        <TimelineEvent 
          event={term.event} 
          eventDescription={term.eventDescription} 
          mishap={term.mishap} 
        />
        
        {/* Entities */}
        {term.spawnedEntities.length > 0 && (
          <div className="mt-auto pt-2 flex flex-wrap gap-1">
            {term.spawnedEntities.map((entity, i) => (
              <EntityBadge 
                key={`${entity.graphNodeId}-${i}`} 
                entity={entity} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEntityClick?.(entity.graphNodeId);
                }} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Hover action hint */}
      <div className="h-1 bg-gray-700/0 group-hover:bg-blue-500/50 transition-colors rounded-b-lg" />
    </div>
  );
}

function EntityBadge({ entity, onClick }: { entity: SpawnedEntityRef; onClick: (e: React.MouseEvent) => void }) {
  const getIcon = () => {
    switch (entity.type) {
      case 'npc': return <User className="w-3 h-3" />;
      case 'location': return <MapPin className="w-3 h-3" />;
      case 'item': return <Package className="w-3 h-3" />;
      case 'secret': return <FileKey className="w-3 h-3" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  const getColor = () => {
    switch (entity.relationship) {
      case 'enemy': return 'text-red-400 bg-red-950/30 border-red-900';
      case 'rival': return 'text-orange-400 bg-orange-950/30 border-orange-900';
      case 'ally': return 'text-green-400 bg-green-950/30 border-green-900';
      case 'contact': return 'text-blue-400 bg-blue-950/30 border-blue-900';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  return (
    <div 
      className={`
        flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] 
        ${getColor()} hover:brightness-125 cursor-pointer
      `}
      onClick={onClick}
      title={`${entity.name} (${entity.relationship || entity.type})`}
    >
      {getIcon()}
      <span className="max-w-[80px] truncate">{entity.name}</span>
    </div>
  );
}
