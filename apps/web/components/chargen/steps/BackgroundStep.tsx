'use client';

import React, { useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import { 
  createCharacter, 
  rerollCharacteristics, 
  swapCharacteristics, 
  setBackgroundSkills,
  updateCharacter,
  createSession,
  getSession
} from '../../../lib/chargen/state';
import { useCharacter } from '../../../lib/chargen/hooks';
import { getOrCreateUser } from '../../../lib/identity';
import { getBackgroundSkills, getCharacteristicModifier } from '@planeshift/mgt2e';
import type { CharacteristicCode } from '@planeshift/mgt2e';
import { GlassPanel } from '../../../components/ui/scifi/GlassPanel';
import { THEME_HEX } from '../../../lib/design-system/themeUtils';

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
    
    if (!getSession(doc)) {
      createSession(doc, 'default-campaign', user.userId);
    }
    
    const newId = createCharacter(doc, user.userId);
    
    localStorage.setItem('planeshift_active_character', JSON.stringify({
      characterId: newId,
      name: 'Unnamed Character',
    }));
    
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
    const newName = e.target.value;
    updateCharacter(doc, characterId, 'name', newName);
    
    localStorage.setItem('planeshift_active_character', JSON.stringify({
      characterId,
      name: newName || 'Unnamed Character',
    }));
  }

  if (!characterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <GlassPanel theme="cyan" variant="elevated" className="max-w-md p-8 text-center space-y-6">
          <h2 className="text-2xl font-bold text-zinc-100">Start Character Generation</h2>
          <p className="text-zinc-400">
            Create a new Traveller character. You'll roll for characteristics, choose a background,
            and embark on a career.
          </p>
          <button 
            onClick={handleCreate}
            className="px-6 py-3 rounded-lg font-bold transition-all duration-300"
            style={{
              backgroundColor: THEME_HEX.cyan,
              color: '#0a0d14',
              boxShadow: `0 0 16px ${THEME_HEX.cyan}40`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 24px ${THEME_HEX.cyan}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = `0 0 16px ${THEME_HEX.cyan}40`;
            }}
          >
            Create New Character
          </button>
        </GlassPanel>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-8">
        <GlassPanel theme="cyan" className="p-8 text-center animate-pulse">
          <span className="text-zinc-400">Loading character...</span>
        </GlassPanel>
      </div>
    );
  }

  const bgSkills = getBackgroundSkills();
  const selectedCount = character.backgroundSkills?.length || 0;

  return (
    <div className="space-y-8 p-1">
      <GlassPanel theme="violet" variant="bordered" className="p-4 rounded-lg">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
        <input 
          type="text" 
          value={character.name}
          onChange={handleNameChange}
          className="w-full px-4 py-2 rounded text-zinc-100 transition-all focus:outline-none"
          style={{
            backgroundColor: 'rgba(10, 13, 20, 0.8)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
          }}
          placeholder="Enter character name..."
          onFocus={(e) => {
            e.currentTarget.style.borderColor = THEME_HEX.cyan;
            e.currentTarget.style.boxShadow = `0 0 8px ${THEME_HEX.cyan}30`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </GlassPanel>

      <GlassPanel theme="cyan" variant="bordered" className="p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-100">Characteristics</h3>
          <button 
            onClick={handleReroll}
            className="text-xs text-zinc-200 px-3 py-1 rounded transition-all duration-300"
            style={{ 
              backgroundColor: 'rgba(30, 41, 59, 0.5)', 
              border: '1px solid rgba(148, 163, 184, 0.2)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 10px ${THEME_HEX.slate}40`;
              e.currentTarget.style.borderColor = THEME_HEX.slate;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
            }}
          >
            Re-roll All
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {STAT_ORDER.map(stat => {
            const val = character.characteristics[stat] || 0;
            const mod = getCharacteristicModifier(val);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const modColor = mod >= 0 ? THEME_HEX.cyan : '#ef4444';

            return (
              <div 
                key={stat} 
                className="rounded p-3 text-center transition-all duration-300"
                style={{ 
                  backgroundColor: 'rgba(10, 13, 20, 0.8)',
                  border: `1px solid ${THEME_HEX.cyan}30`
                }}
              >
                <div className="text-xs font-bold text-zinc-500 mb-1">{stat}</div>
                <div className="text-2xl font-mono text-zinc-100 font-bold">{val}</div>
                <div className="text-sm font-bold" style={{ color: modColor }}>{modStr}</div>
              </div>
            );
          })}
        </div>

        <div 
          className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded"
          style={{
            backgroundColor: 'rgba(10, 13, 20, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.1)'
          }}
        >
          <span className="text-sm text-zinc-400">Swap:</span>
          <select 
            value={swap1} 
            onChange={(e) => setSwap1(e.target.value as CharacteristicCode)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-500"
          >
            {STAT_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-zinc-500">⟷</span>
          <select 
            value={swap2} 
            onChange={(e) => setSwap2(e.target.value as CharacteristicCode)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-500"
          >
            {STAT_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button 
            onClick={handleSwap}
            disabled={swap1 === swap2}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-4 py-1 rounded text-sm transition-colors ml-auto border border-zinc-700 hover:border-zinc-600"
          >
            Swap
          </button>
        </div>
      </GlassPanel>

      <GlassPanel theme="violet" variant="bordered" className="p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-100">Background Skills</h3>
          <span 
            className="text-sm font-mono"
            style={{ color: selectedCount === 3 ? THEME_HEX.cyan : THEME_HEX.slate }}
          >
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
                className="flex items-center gap-2 p-2 rounded transition-all cursor-pointer select-none"
                style={{
                  backgroundColor: isSelected ? `${THEME_HEX.violet}20` : 'transparent',
                  border: `1px solid ${isSelected ? THEME_HEX.violet : 'transparent'}`,
                  boxShadow: isSelected ? `0 0 10px ${THEME_HEX.violet}20` : 'none',
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSkillToggle(skill.id)}
                  disabled={isDisabled}
                  className="accent-violet-500 w-4 h-4 rounded"
                />
                <span className={`text-sm ${isSelected ? 'text-violet-200' : 'text-zinc-300'}`}>
                  {skill.name}
                </span>
              </label>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}
