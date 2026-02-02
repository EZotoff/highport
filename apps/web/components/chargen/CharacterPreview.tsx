'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCharacter } from '../../lib/chargen/hooks';
import { getCharacteristicModifier, CharacteristicCode } from '@planeshift/mgt2e';
import { LifepathTimeline } from './LifepathTimeline';

interface CharacterPreviewProps {
  characterId?: string | null;
}

const PREVIEW_STATS: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function CharacterPreview({ characterId }: CharacterPreviewProps) {
  const character = useCharacter(characterId || null);
  const [showLifepath, setShowLifepath] = useState(false);

  if (!character) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 h-full flex flex-col">
        <h3 className="text-lg font-bold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">Character Sheet</h3>
        <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm italic">
          No character selected
        </div>
      </div>
    );
  }

  const skillCount = Object.keys(character.skills).length;
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 h-full flex flex-col">
      <h3 className="text-lg font-bold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">Character Sheet</h3>
      
      <div className="space-y-6 flex-1 overflow-y-auto">
        <div>
          <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Name</label>
          <div className={`text-lg ${character.name ? 'text-zinc-100' : 'text-zinc-500 italic'}`}>
            {character.name || 'Unnamed Character'}
          </div>
        </div>
        
        <div className="flex gap-8">
          <div>
            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Age</label>
            <div className="text-2xl font-mono text-zinc-100">{character.age}</div>
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Species</label>
            <div className="text-zinc-200">Human</div>
          </div>
          <div>
            <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Credits</label>
            <div className="text-zinc-200">Cr{character.credits}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 font-bold mb-2">Characteristics</label>
          <div className="grid grid-cols-3 gap-2">
            {PREVIEW_STATS.map((stat) => {
              const val = character.characteristics[stat] ?? 0;
              const mod = getCharacteristicModifier(val);
              return (
                <div key={stat} className="bg-zinc-950 p-2 rounded text-center border border-zinc-800">
                  <div className="text-[10px] text-zinc-500 font-bold">{stat}</div>
                  <div className="text-lg font-mono text-zinc-200">{val}</div>
                  <div className="text-[10px] text-zinc-600">{mod >= 0 ? '+' + mod : mod}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Current Career</label>
          <div className="text-zinc-400 text-sm">
             {character.terms.length > 0 
               ? `${character.terms[character.terms.length - 1].careerId} (Rank ${character.terms[character.terms.length - 1].currentRank})` 
               : 'None'}
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase text-zinc-500 font-bold mb-1">Skills</label>
          {skillCount === 0 ? (
            <div className="text-zinc-500 text-sm italic">No skills learned yet</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(character.skills).map(([s, level]) => (
                <div key={s} className="text-sm text-zinc-300 flex justify-between">
                  <span>{s}</span>
                  <span className="text-zinc-500 text-xs">{level}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {character.terms.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={() => setShowLifepath(!showLifepath)}
              className="flex items-center gap-2 text-xs uppercase text-zinc-400 font-bold hover:text-zinc-200 transition-colors w-full"
            >
              {showLifepath ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Career Timeline ({character.terms.length} terms)
            </button>
            {showLifepath && characterId && (
              <div className="mt-3 -mx-6 px-2">
                <LifepathTimeline characterId={characterId} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-800 text-center text-xs text-zinc-600">
        ID: {character.id.slice(0, 8)}
      </div>
    </div>
  );
}
