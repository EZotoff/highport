'use client';

import React, { useState } from 'react';
import { spawnEntity } from '../../lib/chargen/entity-spawner';
import type { EventSpawn } from '@planeshift/mgt2e';
import type { SpawnedEntityRef } from '../../lib/chargen/types';
import { useNPCNarrative, useNarrativeAvailable } from '../../lib/chargen/useNarrative';
import type { VerbosityLevel } from '../../lib/chargen/narrative';

interface EntitySpawnFormProps {
  spawn: EventSpawn;
  characterId: string;
  termNumber: number;
  eventRoll: number;
  onComplete: (entity: SpawnedEntityRef) => void;
  onSkip: () => void;
}

const SPAWN_TYPE_LABELS: Record<string, string> = {
  npc: 'NPC',
  location: 'Location',
  item: 'Item',
  secret: 'Secret',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  ally: 'ALLY',
  contact: 'CONTACT',
  rival: 'RIVAL',
  enemy: 'ENEMY',
};

const SPAWN_PROMPTS: Record<string, Record<string, string>> = {
  npc: {
    ally: 'Who is this ally? Describe someone who has your back.',
    contact: 'Who is this contact? Someone useful to know.',
    rival: 'Who is this rival? A competitor or adversary.',
    enemy: 'Who is this enemy? Someone who wishes you harm.',
    default: 'Describe this person you encountered.',
  },
  location: {
    default: 'Describe this significant location.',
  },
  item: {
    default: 'Describe this item of note.',
  },
  secret: {
    default: 'What secret did you uncover?',
  },
};

export default function EntitySpawnForm({
  spawn,
  characterId,
  termNumber,
  eventRoll,
  onComplete,
  onSkip,
}: EntitySpawnFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  const [personality, setPersonality] = useState('');
  const [verbosity] = useState<VerbosityLevel>('structured');
  const { isAvailable: narrativeAvailable } = useNarrativeAvailable();
  const { generate: generateNPC, isLoading: generating, error: generateError } = useNPCNarrative();

  const typeLabel = SPAWN_TYPE_LABELS[spawn.type] || spawn.type;
  const relationLabel = spawn.relationship 
    ? RELATIONSHIP_LABELS[spawn.relationship] 
    : null;
  
  const prompts = SPAWN_PROMPTS[spawn.type] || SPAWN_PROMPTS.npc;
  const prompt = spawn.relationship && prompts[spawn.relationship] 
    ? prompts[spawn.relationship] 
    : prompts.default;

  const handleGenerateField = async (field: 'name' | 'motivation' | 'personality') => {
    if (spawn.type !== 'npc') return;
    
    try {
      const result = await generateNPC({
        npcType: spawn.relationship || 'contact',
        context: {
          eventText: prompt,
          career: 'unknown',
          characterName: 'Character',
        },
        existingFields: { 
          name: name || undefined,
          motivation: motivation || undefined,
          personality: personality || undefined,
        },
        verbosity: 'minimal',
      });
      
      switch (field) {
        case 'name':
          if (result.name) setName(result.name);
          break;
        case 'motivation':
          if (result.motivation) setMotivation(result.motivation);
          break;
        case 'personality':
          if (result.personality) setPersonality(result.personality);
          break;
      }
    } catch (e) {
      // Error handled by hook
    }
  };

  const handleGenerateAll = async () => {
    if (spawn.type !== 'npc') return;
    
    try {
      const result = await generateNPC({
        npcType: spawn.relationship || 'contact',
        context: {
          eventText: prompt,
          career: 'unknown', // We don't have career context here
          characterName: 'Character',
        },
        existingFields: name ? { name } : undefined,
        verbosity,
      });
      
      if (result.name && !name) setName(result.name);
      if (result.motivation) setMotivation(result.motivation);
      if (result.personality) setPersonality(result.personality);
      if (result.personality || result.motivation) {
        setDescription([result.personality, result.motivation].filter(Boolean).join('\n\n'));
      }
    } catch (e) {
      // Error is in generateError state
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    const entity = spawnEntity({
      spawn,
      name: name.trim(),
      description: description.trim() || undefined,
      characterId,
      termNumber,
      eventRoll,
    });
    
    onComplete(entity);
  };

  const relationColorMap: Record<string, string> = {
    ally: 'text-green-400 bg-green-900/30 border-green-800',
    contact: 'text-blue-400 bg-blue-900/30 border-blue-800',
    rival: 'text-amber-400 bg-amber-900/30 border-amber-800',
    enemy: 'text-red-400 bg-red-900/30 border-red-800',
  };
  
  const relationColor = (spawn.relationship && relationColorMap[spawn.relationship]) || 'text-zinc-400 bg-zinc-900/30 border-zinc-800';

  return (
    <div className={`border rounded-lg p-4 mt-4 ${relationColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-bold">
          ⚠️ SPAWN {relationLabel ? `${relationLabel} ` : ''}{typeLabel}
        </span>
        {spawn.required && (
          <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded">Required</span>
        )}
      </div>
      
      <p className="text-sm mb-4 opacity-80">{prompt}</p>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">Name *</label>
            {spawn.type === 'npc' && narrativeAvailable && (
              <button
                onClick={() => handleGenerateField('name')}
                disabled={generating}
                type="button"
                className="text-xs px-2 py-0.5 bg-purple-600/50 hover:bg-purple-600 text-purple-200 rounded transition-colors"
              >
                ✨ AI
              </button>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={spawn.type === 'npc' ? 'e.g., Lt. Vasquez' : 'Enter name...'}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">Brief Description (optional)</label>
            {spawn.type === 'npc' && narrativeAvailable && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleGenerateField('motivation')}
                  disabled={generating}
                  type="button"
                  className="text-xs px-2 py-0.5 bg-purple-600/50 hover:bg-purple-600 text-purple-200 rounded transition-colors"
                >
                  Motivation
                </button>
                <button
                  onClick={() => handleGenerateField('personality')}
                  disabled={generating}
                  type="button"
                  className="text-xs px-2 py-0.5 bg-purple-600/50 hover:bg-purple-600 text-purple-200 rounded transition-colors"
                >
                  Personality
                </button>
              </div>
            )}
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context, backstory, or notes..."
            rows={3}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        
        {spawn.type === 'npc' && narrativeAvailable && (
          <div className="pt-2">
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              type="button"
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded text-sm font-medium transition-colors"
            >
              {generating ? 'Generating...' : '✨ Generate NPC Details'}
            </button>
            {generateError && (
              <div className="text-red-400 text-xs mt-1">{generateError.message}</div>
            )}
          </div>
        )}
        
        <div className="flex gap-3 pt-2">
          {!spawn.required && (
            <button
              onClick={onSkip}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
            >
              Skip Entity
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded font-medium transition-colors"
          >
            Add to Campaign Graph →
          </button>
        </div>
      </div>
    </div>
  );
}
