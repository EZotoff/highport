import React, { useEffect, useState } from 'react';
import { 
  User, 
  MapPin, 
  Box, 
  Key, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Trophy, 
  Briefcase,
  ExternalLink,
  Dices
} from 'lucide-react';
import type { CareerTermResult, SpawnedEntityRef } from '../../lib/chargen/types';
import type { DiceResult } from '@planeshift/mgt2e';

interface TermDetailCardProps {
  term: CareerTermResult;
  career: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onEntityClick?: (entityId: string) => void;
}

export function TermDetailCard({
  term,
  career,
  isOpen,
  onClose,
  onEntityClick
}: TermDetailCardProps) {
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 uppercase tracking-wider font-semibold">
              Term {term.termNumber}
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-400" />
              {career.name}
              <span className="text-gray-500 font-normal text-base">
                ({term.assignmentId})
              </span>
            </h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Age</div>
            <div className="text-lg font-mono text-white">
              {term.startAge} <span className="text-gray-600">→</span> {term.startAge + 4}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Dices className="w-4 h-4" />
              Key Rolls
            </h3>
            <div className="grid gap-3">
              {term.survivalRoll && (
                <RollRow 
                  label="Survival" 
                  result={term.survivalRoll} 
                  success={term.survived} 
                  attribute="INT" 
                />
              )}
              {term.commissionRoll && (
                <RollRow 
                  label="Commission" 
                  result={term.commissionRoll} 
                  success={!!term.commissioned} 
                  attribute="SOC" 
                />
              )}
              {term.advancementRoll && (
                <RollRow 
                  label="Advancement" 
                  result={term.advancementRoll} 
                  success={term.advanced} 
                  attribute="EDU" 
                />
              )}
              {term.eventRoll && (
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-300 w-24">Event</span>
                    <span className="font-mono text-sm text-gray-400">
                      {term.eventRoll.dice}({term.eventRoll.rolls.join(',')}) = 
                    </span>
                    <span className="font-mono font-bold text-white text-lg">
                      {term.eventRoll.total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {(term.eventDescription || term.mishap) && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                {term.mishap ? <ShieldAlert className="w-4 h-4 text-red-400" /> : <Trophy className="w-4 h-4 text-yellow-400" />}
                {term.mishap ? 'Mishap' : 'Life Event'}
              </h3>
              <div className={`p-4 rounded-lg border ${term.mishap ? 'bg-red-950/20 border-red-900/50' : 'bg-gray-800 rounded-lg border-gray-700'}`}>
                <p className="text-gray-200 leading-relaxed">
                  {term.eventDescription || term.mishap?.description || term.eventChoice || "No details available."}
                </p>
              </div>
            </section>
          )}

          {term.spawnedEntities.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4" />
                Encounters
              </h3>
              <div className="grid gap-3">
                {term.spawnedEntities.map((entity, i) => (
                  <EntityCard key={i} entity={entity} onClick={onEntityClick} />
                ))}
              </div>
            </section>
          )}

          {term.skillsGained.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Skills Gained
              </h3>
              <div className="flex flex-wrap gap-2">
                {term.skillsGained.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md">
                    <span className="text-sm font-medium text-blue-200">
                      {skill.skill}
                      {skill.specialty ? `: ${skill.specialty}` : ''}
                    </span>
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">
                      {skill.level}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

function RollRow({ 
  label, 
  result, 
  success, 
  attribute 
}: { 
  label: string; 
  result: DiceResult; 
  success: boolean; 
  attribute?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center gap-3">
        {success ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
        <span className="text-sm font-medium text-gray-300 w-20">{label}</span>
      </div>
      
      <div className="flex items-center gap-2 font-mono text-sm text-gray-400">
        <span>{result.dice}({result.rolls.join(',')})</span>
        {result.modifier !== 0 && (
          <span className={result.modifier && result.modifier > 0 ? 'text-blue-400' : 'text-red-400'}>
            {result.modifier && result.modifier > 0 ? '+' : ''}{result.modifier}
            {attribute && <span className="text-gray-500 text-xs ml-0.5">({attribute})</span>}
          </span>
        )}
        <span className="text-gray-600">=</span>
        <span className={`text-lg font-bold ${success ? 'text-white' : 'text-gray-400'}`}>
          {result.total}
        </span>
        {result.target && (
          <span className="text-xs text-gray-500 ml-1">
            ≥ {result.target}
          </span>
        )}
      </div>
    </div>
  );
}

function EntityCard({ 
  entity, 
  onClick 
}: { 
  entity: SpawnedEntityRef; 
  onClick?: (id: string) => void; 
}) {
  const Icon = {
    npc: User,
    location: MapPin,
    item: Box,
    secret: Key
  }[entity.type] || User;

  return (
    <div className="flex items-start gap-4 p-3 bg-gray-800/80 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors group">
      <div className={`mt-1 p-2 rounded-md ${
        entity.relationship === 'rival' || entity.relationship === 'enemy' 
          ? 'bg-red-900/30 text-red-400' 
          : 'bg-blue-900/30 text-blue-400'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white truncate">{entity.name}</h4>
          {entity.relationship && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
              entity.relationship === 'rival' || entity.relationship === 'enemy'
                ? 'bg-red-900/50 text-red-300'
                : 'bg-blue-900/50 text-blue-300'
            }`}>
              {entity.relationship}
            </span>
          )}
        </div>
        {entity.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {entity.description}
          </p>
        )}
      </div>

      {onClick && (
        <button 
          onClick={() => onClick(entity.graphNodeId)}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded-md transition-colors opacity-0 group-hover:opacity-100"
          title="View in Graph"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
