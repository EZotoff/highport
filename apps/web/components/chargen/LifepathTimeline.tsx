import React from 'react';
import { Scroll, Wallet } from 'lucide-react';
import { getCareer } from '@planeshift/mgt2e';
import { useLifepath } from '../../lib/chargen/useLifepath';
import { TimelineTerm } from './TimelineTerm';

interface LifepathTimelineProps {
  characterId: string;
  onEntityClick?: (entityId: string) => void;
}

export function LifepathTimeline({ characterId, onEntityClick }: LifepathTimelineProps) {
  const { character, terms, totalSkills, totalBenefits, isLoading } = useLifepath(characterId);

  if (isLoading || !character) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-gray-900 rounded-xl border border-gray-800">
        <div className="text-gray-500 animate-pulse flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-t-blue-500 border-gray-700 animate-spin" />
          <span>Loading lifepath...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-950 border-b border-gray-800">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <span className="text-blue-500">LIFEPATH:</span> 
          <span className="truncate max-w-[200px] sm:max-w-md">{character.name || 'Unnamed Character'}</span>
        </h2>
        <div className="text-gray-400 font-mono text-sm bg-gray-900 px-3 py-1 rounded border border-gray-800">
          AGE: <span className="text-white font-bold">{character.age}</span>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="relative flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-gray-900/50">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]" />
        
        <div className="relative flex flex-col min-w-max p-6 gap-6">
          
          {/* Age Ruler */}
          {terms.length > 0 && (
            <div className="flex px-1 pb-2 border-b border-gray-800">
              {terms.map((term, i) => (
                <div key={`ruler-${i}`} className="w-[236px] shrink-0 text-xs text-gray-500 font-mono pl-1 border-l border-gray-700/30">
                  AGE {term.startAge}
                </div>
              ))}
              {/* Final age marker */}
              <div className="w-4 shrink-0 text-xs text-gray-500 font-mono pl-1 border-l border-gray-700/30">
                {character.age}
              </div>
            </div>
          )}

          {/* Terms Track */}
          <div className="flex gap-4">
            {terms.length === 0 ? (
               <div className="h-40 flex flex-col items-center justify-center text-gray-600 w-[600px] border-2 border-dashed border-gray-800 rounded-lg bg-gray-900/50">
                 <p className="italic">No career terms recorded yet.</p>
                 <p className="text-sm mt-2">Start a career to begin your journey.</p>
               </div>
            ) : (
              terms.map((term, index) => {
                const careerDef = getCareer(term.careerId);
                const careerName = careerDef?.name || 'Unknown Career';
                
                return (
                  <TimelineTerm
                    key={`${term.termNumber}-${index}`}
                    term={term}
                    career={{ id: term.careerId, name: careerName }}
                    onExpand={() => {
                      // Future: Open term detail modal
                      console.log('Expand term:', term);
                    }}
                    onEntityClick={onEntityClick}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer: Summary */}
      <div className="bg-gray-950 border-t border-gray-800 p-4 flex flex-col sm:flex-row gap-6 text-sm z-10 relative shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
        
        {/* Skills */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 text-blue-400 mb-2 uppercase text-[10px] font-bold tracking-wider">
            <Scroll className="w-3 h-3" /> Skills Gained
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
            {Object.keys(totalSkills).length > 0 ? (
              Object.entries(totalSkills)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([skill, level]) => (
                <span key={skill} className="px-2 py-0.5 bg-gray-900 rounded text-gray-300 border border-gray-800 text-xs shadow-sm">
                  {skill}-{level}
                </span>
              ))
            ) : (
              <span className="text-gray-600 italic text-xs">None yet</span>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="flex-1 min-w-[200px] border-t sm:border-t-0 sm:border-l border-gray-800 pt-4 sm:pt-0 sm:pl-6">
          <div className="flex items-center gap-2 text-green-400 mb-2 uppercase text-[10px] font-bold tracking-wider">
            <Wallet className="w-3 h-3" /> Benefits & Assets
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
            {totalBenefits.length > 0 ? (
              totalBenefits.map((benefit, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-900 rounded text-gray-300 border border-gray-800 text-xs shadow-sm">
                  {benefit}
                </span>
              ))
            ) : (
              <span className="text-gray-600 italic text-xs">None yet</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
