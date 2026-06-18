'use client';

import React, { useState } from 'react';
import { spawnEntity } from '../../lib/chargen/entity-spawner';
import type { EventSpawn } from '@highport/mgt2e';
import type { SpawnedEntityRef } from '../../lib/chargen/types';
import { useNPCNarrative, useNarrativeAvailable } from '../../lib/chargen/useNarrative';
import { NarrativeUnavailableNotice } from './NarrativeUnavailableNotice';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { SciFiInput, SciFiButton } from '@/components/ui/scifi';
import {
  usePortraitGenerator,
  attachPortraitToNode,
  attachPortraitRecord,
} from '../../lib/portrait/usePortrait';
import type { PortraitRecord, PortraitTags } from '@highport/shared/types/portrait';
import { useSession } from '../../lib/chargen/hooks';
import { PortraitLibrary } from '@/components/portrait/PortraitLibrary';
import { PortraitRemixer } from '@/components/portrait/PortraitRemixer';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { PortraitGenerationProgress } from '@/components/portrait/PortraitGenerationProgress';

interface EntitySpawnFormProps {
  spawn: EventSpawn;
  characterId: string;
  termNumber: number;
  eventRoll: number;
  onComplete: (entity: SpawnedEntityRef) => void;
  onSkip: () => void;
  verbosity: VerbosityLevel;
  career: string;
  characterName: string;
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
  verbosity,
  career,
  characterName,
}: EntitySpawnFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  const [personality, setPersonality] = useState('');
  const [portrait, setPortrait] = useState<PortraitRecord | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [remixerOpen, setRemixerOpen] = useState(false);
  const { isAvailable: narrativeAvailable } = useNarrativeAvailable();
  const {
    generate: generateNPC,
    isLoading: generating,
    error: generateError,
    unavailable: npcUnavailable,
  } = useNPCNarrative();
  const {
    generate: generatePortrait,
    isLoading: generatingPortrait,
    error: portraitError,
  } = usePortraitGenerator();
  const session = useSession();

  const typeLabel = SPAWN_TYPE_LABELS[spawn.type] || spawn.type;
  const relationLabel = spawn.relationship ? RELATIONSHIP_LABELS[spawn.relationship] : null;

  const prompts = SPAWN_PROMPTS[spawn.type] || SPAWN_PROMPTS.npc;
  const prompt =
    spawn.relationship && prompts[spawn.relationship]
      ? prompts[spawn.relationship]
      : prompts.default;

  const handleGenerateField = async (field: 'name' | 'motivation' | 'personality') => {
    if (spawn.type !== 'npc') return;

    try {
      const result = await generateNPC({
        npcType: spawn.relationship || 'contact',
        context: {
          eventText: prompt,
          career: career,
          characterName: characterName,
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
          career: career,
          characterName: characterName,
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

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const entity = spawnEntity({
      spawn,
      name: name.trim(),
      description: description.trim() || undefined,
      characterId,
      termNumber,
      eventRoll,
    });

    if (portrait) {
      try {
        await attachPortraitRecord(entity.graphNodeId, portrait.id);
        attachPortraitToNode(entity.graphNodeId, portrait);
      } catch (error) {
        console.error('Failed to attach portrait:', error);
      }
    }

    onComplete(entity);
  };

  const handleGeneratePortrait = async () => {
    if (!session?.campaignId) return;

    const appearanceText = [description, personality, motivation]
      .map((value) => value.trim())
      .filter(Boolean)
      .join('\n');

    const tags: Partial<PortraitTags> = {
      story: {
        entity_type: 'npc',
        relationship_type: spawn.relationship,
        importance_level: spawn.required ? 'key' : 'supporting',
      },
    };

    const result = await generatePortrait({
      campaignId: session.campaignId,
      tags,
      appearanceText: appearanceText || name,
      protected: spawn.required,
      sourcePolicy: spawn.required ? 'subject_only' : 'campaign',
    });

    setPortrait(result);
  };

  const relationColorMap: Record<string, string> = {
    ally: 'text-green-400 bg-green-900/30 border-green-800',
    contact: 'text-blue-400 bg-blue-900/30 border-blue-800',
    rival: 'text-amber-400 bg-amber-900/30 border-amber-800',
    enemy: 'text-red-400 bg-red-900/30 border-red-800',
  };

  const relationColor =
    (spawn.relationship && relationColorMap[spawn.relationship]) ||
    'text-subtle bg-zinc-900/30 border-zinc-800';

  return (
    <div className={`border rounded-lg p-4 mt-4 ${relationColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg font-bold">
          ⚠️ SPAWN {relationLabel ? `${relationLabel} ` : ''}
          {typeLabel}
        </span>
        {spawn.required && (
          <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded">Required</span>
        )}
      </div>

      <p className="text-sm mb-4 opacity-80">{prompt}</p>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="spawn-entity-name" className="text-sm font-medium">
              Name *
            </label>
            {spawn.type === 'npc' && narrativeAvailable && (
              <SciFiButton
                onClick={() => handleGenerateField('name')}
                disabled={generating}
                type="button"
                theme="violet"
                scifiVariant="secondary"
                size="sm"
              >
                ✨ AI
              </SciFiButton>
            )}
          </div>
          <SciFiInput
            id="spawn-entity-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={spawn.type === 'npc' ? 'e.g., Lt. Vasquez' : 'Enter name...'}
            theme="cyan"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="spawn-entity-description" className="text-sm font-medium">
              Brief Description (optional)
            </label>
            {spawn.type === 'npc' && narrativeAvailable && (
              <div className="flex gap-1">
                <SciFiButton
                  onClick={() => handleGenerateField('motivation')}
                  disabled={generating}
                  type="button"
                  theme="violet"
                  scifiVariant="secondary"
                  size="sm"
                >
                  Motivation
                </SciFiButton>
                <SciFiButton
                  onClick={() => handleGenerateField('personality')}
                  disabled={generating}
                  type="button"
                  theme="violet"
                  scifiVariant="secondary"
                  size="sm"
                >
                  Personality
                </SciFiButton>
              </div>
            )}
          </div>
          <textarea
            id="spawn-entity-description"
            aria-label="Entity description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add context, backstory, or notes..."
            rows={3}
            className="w-full min-h-[44px] bg-[var(--star-metal)] border border-[var(--asteroid-dust-50)] text-default rounded-lg p-2 focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 focus:border-cyan-500/50 outline-none resize-none"
          />
        </div>

        {spawn.type === 'npc' && narrativeAvailable && (
          <div className="pt-2">
            <SciFiButton
              onClick={handleGenerateAll}
              disabled={generating}
              type="button"
              theme="violet"
              className="w-full"
            >
              {generating ? 'Generating...' : '✨ Generate NPC Details'}
            </SciFiButton>
            {npcUnavailable ? (
              <NarrativeUnavailableNotice />
            ) : generateError ? (
              <div className="text-red-400 text-xs mt-1">{generateError.message}</div>
            ) : null}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {!spawn.required && (
            <SciFiButton onClick={onSkip} theme="slate" scifiVariant="ghost" type="button">
              Skip Entity
            </SciFiButton>
          )}
          <SciFiButton
            onClick={handleSubmit}
            disabled={!name.trim()}
            theme="cyan"
            glow
            className="flex-1"
            type="button"
          >
            Add to Campaign Graph →
          </SciFiButton>
        </div>

        {spawn.type === 'npc' && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Portrait</div>
              {portrait && (
                <span className="text-xs" style={{ color: THEME_HEX.emerald }}>
                  Generated
                </span>
              )}
            </div>

            {portrait ? (
              <div className="flex items-center gap-3">
                <img
                  src={portrait.image_url || ''}
                  alt={`Portrait of ${name || 'NPC'}`}
                  className="w-20 h-20 rounded-lg object-cover border border-zinc-700"
                />
                <div className="flex gap-2">
                  <SciFiButton
                    onClick={handleGeneratePortrait}
                    disabled={generatingPortrait || !session?.campaignId}
                    type="button"
                    theme="slate"
                    scifiVariant="secondary"
                    size="sm"
                  >
                    Regenerate
                  </SciFiButton>
                  <SciFiButton
                    onClick={() => setRemixerOpen(true)}
                    disabled={generatingPortrait || !session?.campaignId}
                    type="button"
                    theme="violet"
                    scifiVariant="secondary"
                    size="sm"
                  >
                    Remix
                  </SciFiButton>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {generatingPortrait ? (
                  <div className="w-full flex justify-center">
                    <PortraitGenerationProgress isGenerating={generatingPortrait} />
                  </div>
                ) : (
                  <>
                    <SciFiButton
                      onClick={handleGeneratePortrait}
                      disabled={generatingPortrait || !session?.campaignId}
                      type="button"
                      theme="slate"
                      scifiVariant="secondary"
                      size="sm"
                    >
                      Generate Portrait
                    </SciFiButton>
                    <SciFiButton
                      onClick={() => setLibraryOpen(true)}
                      disabled={generatingPortrait || !session?.campaignId}
                      type="button"
                      theme="slate"
                      scifiVariant="secondary"
                      size="sm"
                    >
                      Browse Library
                    </SciFiButton>
                  </>
                )}
              </div>
            )}

            {portraitError && (
              <div className="text-xs mt-2" style={{ color: THEME_HEX.red }}>
                {portraitError.message}
              </div>
            )}
            {!session?.campaignId && (
              <div className="text-xs mt-2" style={{ color: THEME_HEX.amber }}>
                Portraits require an active session.
              </div>
            )}

            {session?.campaignId && (
              <>
                <PortraitLibrary
                  open={libraryOpen}
                  onOpenChange={setLibraryOpen}
                  campaignId={session.campaignId}
                  onSelect={(p) => {
                    setPortrait(p);
                    setLibraryOpen(false);
                  }}
                  filterTags={{
                    story: {
                      entity_type: 'npc',
                      relationship_type: spawn.relationship as any,
                    },
                  }}
                />
                {portrait && (
                  <PortraitRemixer
                    open={remixerOpen}
                    onOpenChange={setRemixerOpen}
                    sourcePortrait={portrait}
                    campaignId={session.campaignId}
                    onRemixed={(p) => {
                      setPortrait(p);
                      setRemixerOpen(false);
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
