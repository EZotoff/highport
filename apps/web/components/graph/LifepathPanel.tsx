import React from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Briefcase, 
  User, 
  MapPin, 
  Box, 
  Key, 
  CheckCircle2, 
  XCircle, 
  ArrowRight
} from 'lucide-react';
import { useSelectedLifepath } from '../../lib/graph/useSelectedLifepath';
import type { CareerTermResult, SpawnedEntityRef } from '../../lib/chargen/types';

interface LifepathPanelProps {
  selectedNodeId: string | null;
  onViewFull?: (characterId: string) => void;
  onEntityClick?: (entityId: string) => void;
}

export function LifepathPanel({ selectedNodeId, onViewFull, onEntityClick }: LifepathPanelProps) {
  const { character, terms, isOpen, setIsOpen } = useSelectedLifepath(selectedNodeId);

  if (!character && !isOpen) return null;

  return (
    <div 
      className={`fixed right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-l border-gray-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-20 left-0 -translate-x-full bg-gray-900 border border-gray-800 border-r-0 rounded-l-lg p-2 text-gray-400 hover:text-white transition-colors shadow-lg"
        aria-label={isOpen ? "Close lifepath panel" : "Open lifepath panel"}
      >
        {isOpen ? <ChevronRight size={20} /> : <div className="flex items-center gap-2 px-1"><span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Lifepath</span><ChevronLeft size={20} /></div>}
      </button>

      {character && (
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-800 bg-gray-900">
            <h2 className="text-xl font-bold text-white mb-1">{character.name}</h2>
            <div className="text-sm text-gray-400 font-mono">Age: {character.age}</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {terms.map((term, index) => (
              <CompactTermCard 
                key={`${term.careerId}-${term.termNumber}-${index}`}
                term={term}
                onEntityClick={onEntityClick}
              />
            ))}
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <button
              onClick={() => onViewFull?.(character.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              View Full Timeline
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompactTermCard({ term, onEntityClick }: { term: CareerTermResult; onEntityClick?: (id: string) => void }) {
  const careerName = term.careerId.charAt(0).toUpperCase() + term.careerId.slice(1);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-gray-200">{careerName}</span>
        </div>
        {term.survived ? (
          <div title="Survived">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        ) : (
          <div title="Mishap">
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400 leading-relaxed line-clamp-2 mb-3">
        {term.eventDescription || term.eventChoice || "No event details."}
      </div>

      {term.spawnedEntities.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-700/50">
          {term.spawnedEntities.map((entity, i) => (
            <button
              key={i}
              onClick={() => onEntityClick?.(entity.graphNodeId)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <EntityIcon type={entity.type} />
              <span className="text-xs font-medium text-gray-300 group-hover:text-white truncate transition-colors">
                {entity.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EntityIcon({ type }: { type: string }) {
  switch (type) {
    case 'npc': return <User className="w-3 h-3 text-blue-400" />;
    case 'location': return <MapPin className="w-3 h-3 text-emerald-400" />;
    case 'item': return <Box className="w-3 h-3 text-amber-400" />;
    case 'secret': return <Key className="w-3 h-3 text-purple-400" />;
    default: return <User className="w-3 h-3 text-gray-400" />;
  }
}
