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
import { getBackgroundSkills, getCharacteristicModifier } from '@highport/mgt2e';
import type { CharacteristicCode } from '@highport/mgt2e';
import { GlassPanel, SciFiButton, SciFiInput, SciFiSelect } from '@/components/ui/scifi';
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
    
    localStorage.setItem('highport_active_character', JSON.stringify({
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
    
    localStorage.setItem('highport_active_character', JSON.stringify({
      characterId,
      name: newName || 'Unnamed Character',
    }));
  }

  if (!characterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <GlassPanel theme="cyan" variant="elevated" className="max-w-md p-8 text-center space-y-6">
          <h2 className="text-2xl font-bold text-heading font-display">Start Character Generation</h2>
          <p className="text-label">
            Create a new Traveller character. You'll roll for characteristics, choose a background,
            and embark on a career.
          </p>
          <SciFiButton theme="cyan" glow onClick={handleCreate}>
            Create New Character
          </SciFiButton>
        </GlassPanel>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-8">
        <GlassPanel theme="cyan" className="p-8 text-center animate-pulse">
          <span className="text-label">Loading character...</span>
        </GlassPanel>
      </div>
    );
  }

  const bgSkills = getBackgroundSkills();
  const selectedCount = character.backgroundSkills?.length || 0;

  return (
    <div className="space-y-8 p-6">
      <GlassPanel theme="violet" variant="bordered" className="p-6 rounded-lg">
        <SciFiInput 
          value={character.name} 
          onChange={handleNameChange} 
          placeholder="Enter character name" 
          theme="cyan"
          label="Name"
        />
      </GlassPanel>

      <GlassPanel theme="cyan" variant="bordered" className="p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-heading font-display">Characteristics</h3>
          <SciFiButton scifiVariant="outline" theme="violet" onClick={handleReroll}>
            Re-roll All
          </SciFiButton>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {STAT_ORDER.map(stat => {
            const val = character.characteristics[stat] || 0;
            const mod = getCharacteristicModifier(val);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            const modColor = mod >= 0 ? '#22d3ee' : '#f87171';

            return (
              <div 
                key={stat} 
                className="rounded p-3 text-center transition-all duration-300"
                style={{ 
                  backgroundColor: 'rgba(10, 13, 20, 0.8)',
                  border: `1px solid ${THEME_HEX.cyan}30`
                }}
              >
                <div className="text-xs font-bold text-subtle mb-1">{stat}</div>
                <div className="text-2xl font-mono text-heading font-bold">{val}</div>
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
          <span className="text-sm text-subtle">Swap:</span>
          <div className="w-24">
            <SciFiSelect 
              value={swap1} 
              onValueChange={(val) => setSwap1(val as CharacteristicCode)}
              options={STAT_ORDER.map(s => ({ value: s, label: s }))}
              theme="cyan"
            />
          </div>
          <span className="text-subtle">⟷</span>
          <div className="w-24">
            <SciFiSelect 
              value={swap2} 
              onValueChange={(val) => setSwap2(val as CharacteristicCode)}
              options={STAT_ORDER.map(s => ({ value: s, label: s }))}
              theme="cyan"
            />
          </div>
          <div className="ml-auto">
            <SciFiButton scifiVariant="outline" theme="cyan" onClick={handleSwap} disabled={swap1 === swap2}>
              Swap
            </SciFiButton>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel theme="violet" variant="bordered" className="p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-heading font-display">Background Skills</h3>
          <span 
            className={`text-sm font-mono ${selectedCount === 3 ? 'text-cyan-400' : 'text-subtle'}`}
          >
            Selected: {selectedCount}/3
          </span>
        </div>
        
        <p className="text-sm text-label mb-6">
          Choose 3 skills from your background. These starts at Level 0.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {bgSkills.map(skill => {
            const isSelected = character.backgroundSkills?.includes(skill.id);
            const isDisabled = !isSelected && selectedCount >= 3;
            
            return (
              <label 
                key={skill.id} 
                className={`flex items-center gap-2 p-2 rounded transition-all select-none ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${!isSelected && !isDisabled ? 'hover:bg-white/5' : ''}`}
                style={{
                  backgroundColor: isSelected ? `${THEME_HEX.violet}20` : undefined,
                  border: `1px solid ${isSelected ? THEME_HEX.violet : 'transparent'}`,
                  boxShadow: isSelected ? `0 0 10px ${THEME_HEX.violet}20` : 'none',
                }}
              >
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSkillToggle(skill.id)}
                  disabled={isDisabled}
                  className="accent-violet-500 w-4 h-4 rounded"
                />
                <span className={`text-sm ${isSelected ? 'text-violet-200' : 'text-default'}`}>
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
