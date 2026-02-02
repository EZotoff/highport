'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import { getCharacteristicModifier, getCareer, type CharacteristicSet } from '@planeshift/mgt2e';
import {
  createCharacterNode,
  formatSkillsForDisplay,
  formatSkillsLevel0,
} from '../../../lib/chargen/finalize';
import { getRankInfo } from '../../../lib/chargen/term-resolution';
import { GlassPanel } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface FinalizeStepProps {
  characterId: string | null;
}

const CHARACTERISTIC_ORDER: (keyof CharacteristicSet)[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

const RELATIONSHIP_ICONS: Record<string, string> = {
  ally: '🟢',
  contact: '🔵',
  rival: '🟠',
  enemy: '🔴',
};

export default function FinalizeStep({ characterId }: FinalizeStepProps) {
  const router = useRouter();
  const character = useCharacter(characterId);
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  if (character && !hasInitialized) {
    setName(character.name || '');
    setHasInitialized(true);
  }

  if (!character) return <div className="text-zinc-400">Loading...</div>;

  const finalTerm = character.terms[character.terms.length - 1];
  const career = getCareer(finalTerm?.careerId || '');
  const rankInfo = career ? getRankInfo(career, finalTerm?.currentRank || 0) : null;
  
  const connections = character.terms.flatMap((term, termIndex) => 
    term.spawnedEntities.map(e => ({
      ...e,
      termNumber: termIndex + 1,
    }))
  );

  const handleNameChange = (newName: string) => {
    setName(newName);
    const doc = getYDoc();
    updateCharacterFields(doc, character.id, { name: newName });
  };

  const handleCreateCharacter = async () => {
    if (!name.trim()) {
      alert('Please enter a character name');
      return;
    }
    
    setIsCreating(true);
    
    try {
      createCharacterNode(character);
      router.push('/graph');
    } catch (error) {
      console.error('Failed to create character node:', error);
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    const doc = getYDoc();
    updateCharacterFields(doc, character.id, { status: 'mustering_out' });
  };

  const trainedSkills = formatSkillsForDisplay(character.skills);
  const level0Skills = formatSkillsLevel0(character.skills);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GlassPanel theme="cyan" variant="default" className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Character Complete</h2>

        <div 
          className="rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'rgba(10, 13, 20, 0.8)' }}
        >
          <div className="mb-4">
            <label className="block text-sm mb-1" style={{ color: THEME_HEX.slate }}>Character Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter character name..."
              className="w-full px-4 py-2 rounded text-xl text-white font-bold transition-all duration-300 focus:outline-none"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${THEME_HEX.slate}40`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = THEME_HEX.cyan;
                e.currentTarget.style.boxShadow = `0 0 12px ${THEME_HEX.cyan}40`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = `${THEME_HEX.slate}40`;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div className="flex justify-between" style={{ color: THEME_HEX.slate }}>
            <span>Age: <span className="text-white">{character.age}</span></span>
            <span>
              {career?.name} ({character.terms.length} term{character.terms.length !== 1 ? 's' : ''})
              {rankInfo && <span style={{ color: THEME_HEX.slate }}> • {rankInfo.title}</span>}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Characteristics</h3>
          <div className="grid grid-cols-3 gap-3">
            {CHARACTERISTIC_ORDER.map(stat => {
              const value = character.characteristics[stat] || 0;
              const dm = getCharacteristicModifier(value);
              return (
                <div 
                  key={stat} 
                  className="rounded p-3 text-center"
                  style={{ backgroundColor: 'rgba(10, 13, 20, 0.8)' }}
                >
                  <div style={{ color: THEME_HEX.slate }} className="text-xs mb-1">{stat}</div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div 
                    style={{ color: dm >= 0 ? THEME_HEX.cyan : '#ef4444' }}
                    className="text-sm"
                  >
                    {dm >= 0 ? '+' : ''}{dm}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Skills</h3>
          <div className="rounded p-4" style={{ backgroundColor: 'rgba(10, 13, 20, 0.8)' }}>
            {trainedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {trainedSkills.map((skill, i) => (
                  <span 
                    key={i} 
                    className="px-2 py-1 rounded text-sm"
                    style={{ 
                      backgroundColor: 'rgba(0, 240, 255, 0.15)', 
                      color: THEME_HEX.cyan 
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: THEME_HEX.slate }} className="mb-3">No trained skills</div>
            )}
            
            {level0Skills.length > 0 && (
              <div>
                <div className="text-xs mb-2" style={{ color: THEME_HEX.slate }}>Level 0:</div>
                <div className="flex flex-wrap gap-2">
                  {level0Skills.map((skill, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: 'rgba(148, 163, 184, 0.1)', 
                        color: THEME_HEX.slate 
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Benefits</h3>
          <div className="rounded p-4 space-y-2" style={{ backgroundColor: 'rgba(10, 13, 20, 0.8)' }}>
            <div className="flex items-center gap-2">
              <span className="text-green-400">💰</span>
              <span className="text-white">Cr{character.credits.toLocaleString()}</span>
            </div>
            {character.benefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2">
                <span>🎁</span>
                <span className="text-white">{benefit}</span>
              </div>
            ))}
            {character.benefits.length === 0 && character.credits === 0 && (
              <div style={{ color: THEME_HEX.slate }}>No benefits accumulated</div>
            )}
          </div>
        </div>

        {connections.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3">Connections</h3>
            <div className="rounded p-4 space-y-2" style={{ backgroundColor: 'rgba(10, 13, 20, 0.8)' }}>
              {connections.map((conn, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span>{RELATIONSHIP_ICONS[conn.relationship || ''] || '⚪'}</span>
                  <span className="capitalize" style={{ color: THEME_HEX.slate }}>{conn.relationship}:</span>
                  <span className="text-white">{conn.name}</span>
                  <span className="text-sm" style={{ color: THEME_HEX.slate }}>(Term {conn.termNumber})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="px-6 py-2 rounded transition-all duration-300"
          style={{ 
            backgroundColor: 'transparent', 
            color: THEME_HEX.slate,
            border: `1px solid ${THEME_HEX.slate}40`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = THEME_HEX.cyan;
            e.currentTarget.style.color = THEME_HEX.cyan;
            e.currentTarget.style.boxShadow = `0 0 12px ${THEME_HEX.cyan}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${THEME_HEX.slate}40`;
            e.currentTarget.style.color = THEME_HEX.slate;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ← Back to Benefits
        </button>
        
        <button
          onClick={handleCreateCharacter}
          disabled={isCreating || !name.trim()}
          className="px-6 py-3 rounded font-bold transition-all duration-300"
          style={isCreating || !name.trim() 
            ? { 
                backgroundColor: 'rgba(26, 31, 46, 0.6)',
                color: THEME_HEX.slate,
                cursor: 'not-allowed',
              }
            : { 
                backgroundColor: THEME_HEX.cyan,
                color: '#0a0d14',
                boxShadow: `0 0 16px ${THEME_HEX.cyan}40`,
              }
          }
          onMouseEnter={(e) => {
            if (!isCreating && name.trim()) {
              e.currentTarget.style.boxShadow = `0 0 24px ${THEME_HEX.cyan}60`;
            }
          }}
          onMouseLeave={(e) => {
            if (!isCreating && name.trim()) {
              e.currentTarget.style.boxShadow = `0 0 16px ${THEME_HEX.cyan}40`;
            }
          }}
        >
          {isCreating ? 'Creating...' : 'Create Character & View Graph →'}
        </button>
      </div>
    </div>
  );
}
