'use client';

import React, { useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import { 
  createCharacter, 
  rerollCharacteristics, 
  swapCharacteristics, 
  setBackgroundSkills,
  updateCharacter
} from '../../../lib/chargen/state';
import { useCharacter } from '../../../lib/chargen/hooks';
import { getOrCreateUser } from '../../../lib/identity';
import { getBackgroundSkills, getCharacteristicModifier } from '@planeshift/mgt2e';
import type { CharacteristicCode } from '@planeshift/mgt2e';

interface BackgroundStepProps {
  characterId: string | null;
  onCharacterCreated: (charId: string) => void;
}

const STAT_ORDER: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function BackgroundStep({ characterId, onCharacterCreated }: BackgroundStepProps) {
  const character = useCharacter(characterId);
  const [swap1, setSwap1] = useState<CharacteristicCode>('STR');
  const [swap2, setSwap2] = useState<CharacteristicCode>('DEX');

  const handleCreate = async () => {
    const user = getOrCreateUser();
    const doc = getYDoc();
    const newId = createCharacter(doc, user.userId);
    onCharacterCreated(newId);
  };

  const handleReroll = () => {
    if (!characterId) return;
    const doc = getYDoc();
    rerollCharacteristics(doc, characterId);
  };

  const handleSwap = () => {
    if (!characterId) return;
    if (swap1 === swap2) return;
    const doc = getYDoc();
    swapCharacteristics(doc, characterId, swap1, swap2);
  };

  const handleSkillToggle = (skillId: string) => {
    if (!character) return;
    const currentSkills = character.backgroundSkills || [];
    let newSkills: string[];

    if (currentSkills.includes(skillId)) {
      newSkills = currentSkills.filter(s => s !== skillId);
    } else {
      if (currentSkills.length >= 3) return; // Limit to 3
      newSkills = [...currentSkills, skillId];
    }
    
    const doc = getYDoc();
    setBackgroundSkills(doc, character.id, newSkills);
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!characterId) return;
    const doc = getYDoc();
    updateCharacter(doc, characterId, 'name', e.target.value);
  }

  if (!characterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-zinc-100">Start Character Generation</h2>
          <p className="text-zinc-400 max-w-md">
            Create a new Traveller character. You'll roll for characteristics, choose a background,
            and embark on a career.
          </p>
          <button 
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Create New Character
          </button>
        </div>
      </div>
    );
  }

  if (!character) return <div className="p-8 text-zinc-400">Loading character...</div>;

  const bgSkills = getBackgroundSkills();
  const selectedCount = character.backgroundSkills?.length || 0;

  return (
    <div className="space-y-8 p-1">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
        <input 
          type="text" 
          value={character.name}
          onChange={handleNameChange}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-4 py-2 text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Enter character name..."
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-100">Characteristics</h3>
          <button 
            onClick={handleReroll}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded transition-colors"
          >
            Re-roll All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {STAT_ORDER.map(stat => {
            const val = character.characteristics[stat] || 0;
            const mod = getCharacteristicModifier(val);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            return (
              <div key={stat} className="bg-zinc-950 border border-zinc-800 rounded p-3 text-center">
                <div className="text-xs font-bold text-zinc-500 mb-1">{stat}</div>
                <div className="text-2xl font-mono text-zinc-100 font-bold">{val}</div>
                <div className="text-sm text-zinc-500">{modStr}</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950 p-3 rounded border border-zinc-800">
          <span className="text-sm text-zinc-400">Swap:</span>
          <select 
            value={swap1} 
            onChange={(e) => setSwap1(e.target.value as CharacteristicCode)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
          >
            {STAT_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-zinc-500">⟷</span>
          <select 
            value={swap2} 
            onChange={(e) => setSwap2(e.target.value as CharacteristicCode)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm"
          >
            {STAT_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button 
            onClick={handleSwap}
            disabled={swap1 === swap2}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-4 py-1 rounded text-sm transition-colors ml-auto"
          >
            Swap
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-100">Background Skills</h3>
          <span className={`text-sm ${selectedCount === 3 ? 'text-green-500' : 'text-zinc-400'}`}>
            Selected: {selectedCount}/3
          </span>
        </div>
        
        <p className="text-sm text-zinc-400 mb-4">
          Choose 3 skills from your background. These starts at Level 0.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {bgSkills.map(skill => {
            const isSelected = character.backgroundSkills?.includes(skill.id);
            const isDisabled = !isSelected && selectedCount >= 3;
            
            return (
              <label 
                key={skill.id} 
                className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer select-none ${
                  isSelected 
                    ? 'bg-blue-900/20 border-blue-800' 
                    : isDisabled 
                      ? 'opacity-50 cursor-not-allowed border-transparent' 
                      : 'hover:bg-zinc-800 border-transparent'
                }`}
              >
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSkillToggle(skill.id)}
                  disabled={isDisabled}
                  className="accent-blue-500 w-4 h-4 rounded"
                />
                <span className={`text-sm ${isSelected ? 'text-blue-200' : 'text-zinc-300'}`}>
                  {skill.name}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
