'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Coins, Calendar } from 'lucide-react';
import { useCharacter } from '../../lib/chargen/hooks';
import { getCharacteristicModifier, CharacteristicCode } from '@planeshift/mgt2e';
import { LifepathTimeline } from './LifepathTimeline';
import { GlassPanel, ProcessFlowSheen } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { ANIMATION_TIMING } from '@/lib/design-system/visualConfig';

interface CharacterPreviewProps {
  characterId?: string | null;
}

const PREVIEW_STATS: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function CharacterPreview({ characterId }: CharacterPreviewProps) {
  const character = useCharacter(characterId || null);
  const [showLifepath, setShowLifepath] = useState(false);

  if (!character) {
    return (
      <GlassPanel theme="cyan" variant="default" className="p-6 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: `${THEME_HEX.cyan}20` }}>
          <User className="w-5 h-5" style={{ color: THEME_HEX.cyan }} />
          <h3 className="text-lg font-bold text-gray-100">Character Sheet</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic">
          No character selected
        </div>
      </GlassPanel>
    );
  }

  const skillCount = Object.keys(character.skills).length;
  const transitionDuration = `${ANIMATION_TIMING.TRANSITION_ENTER}ms`;
  
  return (
    <GlassPanel theme="cyan" variant="default" className="p-6 h-full flex flex-col">
      <ProcessFlowSheen duration={5} />
      
      <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: `${THEME_HEX.cyan}20` }}>
        <User className="w-5 h-5" style={{ color: THEME_HEX.cyan }} />
        <h3 className="text-lg font-bold text-gray-100">Character Sheet</h3>
      </div>
      
      <div className="space-y-5 flex-1 overflow-y-auto">
        <div>
          <label 
            className="block text-[10px] uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Name
          </label>
          <div className={`text-lg font-semibold ${character.name ? 'text-gray-100' : 'text-gray-500 italic'}`}>
            {character.name || 'Unnamed Character'}
          </div>
        </div>
        
        <div className="flex gap-4">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${THEME_HEX.violet}15`, border: `1px solid ${THEME_HEX.violet}30` }}
          >
            <Calendar className="w-4 h-4" style={{ color: THEME_HEX.violet }} />
            <div>
              <div className="text-[9px] uppercase text-gray-500">Age</div>
              <div className="text-lg font-mono text-gray-100">{character.age}</div>
            </div>
          </div>
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${THEME_HEX.amber}15`, border: `1px solid ${THEME_HEX.amber}30` }}
          >
            <Coins className="w-4 h-4" style={{ color: THEME_HEX.amber }} />
            <div>
              <div className="text-[9px] uppercase text-gray-500">Credits</div>
              <div className="text-lg font-mono text-gray-100">Cr{character.credits.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div>
          <label 
            className="block text-[10px] uppercase font-mono tracking-wider mb-2"
            style={{ color: THEME_HEX.cyan }}
          >
            Characteristics
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PREVIEW_STATS.map((stat) => {
              const val = character.characteristics[stat] ?? 0;
              const mod = getCharacteristicModifier(val);
              const isHigh = val >= 9;
              const isLow = val <= 5;
              
              return (
                <div 
                  key={stat} 
                  className="p-2 rounded-lg text-center transition-all"
                  style={{ 
                    backgroundColor: isHigh ? `${THEME_HEX.emerald}10` : isLow ? `${THEME_HEX.red}10` : 'rgba(26, 31, 46, 0.6)',
                    border: `1px solid ${isHigh ? THEME_HEX.emerald : isLow ? THEME_HEX.red : 'var(--asteroid-dust-50)'}30`,
                  }}
                >
                  <div 
                    className="text-[10px] font-mono font-bold"
                    style={{ color: isHigh ? THEME_HEX.emerald : isLow ? THEME_HEX.red : THEME_HEX.cyan }}
                  >
                    {stat}
                  </div>
                  <div className="text-xl font-mono font-bold text-gray-100">{val}</div>
                  <div 
                    className="text-[10px] font-mono"
                    style={{ color: mod >= 0 ? THEME_HEX.emerald : THEME_HEX.red }}
                  >
                    {mod >= 0 ? '+' + mod : mod}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label 
            className="block text-[10px] uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Current Career
          </label>
          <div className="text-gray-300 text-sm">
             {character.terms.length > 0 
               ? (
                 <span 
                   className="px-2 py-1 rounded"
                   style={{ backgroundColor: `${THEME_HEX.violet}15`, border: `1px solid ${THEME_HEX.violet}30` }}
                 >
                   {character.terms[character.terms.length - 1].careerId} 
                   <span className="text-gray-500 ml-2">Rank {character.terms[character.terms.length - 1].currentRank}</span>
                 </span>
               )
               : <span className="text-gray-500 italic">None</span>}
          </div>
        </div>

        <div>
          <label 
            className="block text-[10px] uppercase font-mono tracking-wider mb-2"
            style={{ color: THEME_HEX.cyan }}
          >
            Skills ({skillCount})
          </label>
          {skillCount === 0 ? (
            <div className="text-gray-500 text-sm italic">No skills learned yet</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(character.skills).slice(0, 12).map(([s, level]) => (
                <span 
                  key={s} 
                  className="text-[10px] px-2 py-1 rounded font-mono"
                  style={{ 
                    backgroundColor: `${THEME_HEX.emerald}15`,
                    border: `1px solid ${THEME_HEX.emerald}25`,
                    color: THEME_HEX.emerald,
                  }}
                >
                  {s} {level}
                </span>
              ))}
              {skillCount > 12 && (
                <span className="text-[10px] text-gray-500 py-1">
                  +{skillCount - 12} more
                </span>
              )}
            </div>
          )}
        </div>

        {character.terms.length > 0 && (
          <div 
            className="pt-4 border-t"
            style={{ borderColor: 'var(--asteroid-dust-30)' }}
          >
            <button
              onClick={() => setShowLifepath(!showLifepath)}
              className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider transition-colors w-full group"
              style={{ color: THEME_HEX.violet }}
            >
              <span 
                className="transition-transform"
                style={{ 
                  transform: showLifepath ? 'rotate(90deg)' : 'rotate(0deg)',
                  transitionDuration,
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </span>
              <span className="group-hover:brightness-125 transition-all">
                Career Timeline ({character.terms.length} terms)
              </span>
            </button>
            <div 
              className="overflow-hidden"
              style={{
                maxHeight: showLifepath ? '500px' : '0px',
                opacity: showLifepath ? 1 : 0,
                transition: `all ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              {characterId && (
                <div className="mt-3 -mx-6 px-2">
                  <LifepathTimeline characterId={characterId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div 
        className="mt-4 pt-3 border-t text-center text-[10px] font-mono"
        style={{ borderColor: 'var(--asteroid-dust-30)', color: THEME_HEX.slate }}
      >
        ID: {character.id.slice(0, 8)}
      </div>
    </GlassPanel>
  );
}
