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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Character Complete</h2>

        <div className="bg-zinc-950 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-1">Character Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter character name..."
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-between text-zinc-400">
            <span>Age: <span className="text-white">{character.age}</span></span>
            <span>
              {career?.name} ({character.terms.length} term{character.terms.length !== 1 ? 's' : ''})
              {rankInfo && <span className="text-zinc-300"> • {rankInfo.title}</span>}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-zinc-100 mb-3">Characteristics</h3>
          <div className="grid grid-cols-3 gap-3">
            {CHARACTERISTIC_ORDER.map(stat => {
              const value = character.characteristics[stat] || 0;
              const dm = getCharacteristicModifier(value);
              return (
                <div key={stat} className="bg-zinc-950 rounded p-3 text-center">
                  <div className="text-xs text-zinc-500 mb-1">{stat}</div>
                  <div className="text-2xl font-bold text-white">{value}</div>
                  <div className={`text-sm ${dm >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {dm >= 0 ? '+' : ''}{dm}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-zinc-100 mb-3">Skills</h3>
          <div className="bg-zinc-950 rounded p-4">
            {trainedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {trainedSkills.map((skill, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-zinc-500 mb-3">No trained skills</div>
            )}
            
            {level0Skills.length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 mb-2">Level 0:</div>
                <div className="flex flex-wrap gap-2">
                  {level0Skills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-zinc-100 mb-3">Benefits</h3>
          <div className="bg-zinc-950 rounded p-4 space-y-2">
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
              <div className="text-zinc-500">No benefits accumulated</div>
            )}
          </div>
        </div>

        {connections.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-zinc-100 mb-3">Connections</h3>
            <div className="bg-zinc-950 rounded p-4 space-y-2">
              {connections.map((conn, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span>{RELATIONSHIP_ICONS[conn.relationship || ''] || '⚪'}</span>
                  <span className="capitalize text-zinc-400">{conn.relationship}:</span>
                  <span className="text-white">{conn.name}</span>
                  <span className="text-zinc-500 text-sm">(Term {conn.termNumber})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded"
        >
          ← Back to Benefits
        </button>
        
        <button
          onClick={handleCreateCharacter}
          disabled={isCreating || !name.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded font-bold transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Character & View Graph →'}
        </button>
      </div>
    </div>
  );
}
