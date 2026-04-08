'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter, useSession } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import { getCharacteristicModifier, getCareer, type CharacteristicSet } from '@highport/mgt2e';
import {
  createCharacterNode,
  formatSkillsForDisplay,
  formatSkillsLevel0,
} from '../../../lib/chargen/finalize';
import { getRankInfo } from '../../../lib/chargen/term-resolution';
import { GlassPanel, SciFiButton, SciFiInput, SkillBadge } from '@/components/ui/scifi';
import BentoGrid from '../BentoGrid';
import { PortraitGenerationProgress } from '@/components/portrait/PortraitGenerationProgress';
import { Coins, Gift, UserCheck, Users, UserX, Skull, Circle } from 'lucide-react';
import {
  attachPortraitRecord,
  attachPortraitToNode,
  usePortraitGenerator,
} from '../../../lib/portrait/usePortrait';
import type {
  PortraitCareerType,
  PortraitRecord,
  PortraitTags,
} from '@highport/shared/types/portrait';
import { PortraitLibrary } from '@/components/portrait/PortraitLibrary';
import { PortraitRemixer } from '@/components/portrait/PortraitRemixer';

interface FinalizeStepProps {
  characterId: string | null;
}

const CHARACTERISTIC_ORDER: (keyof CharacteristicSet)[] = [
  'STR',
  'DEX',
  'END',
  'INT',
  'EDU',
  'SOC',
];

const RELATIONSHIP_ICONS: Record<string, React.ReactNode> = {
  ally: <UserCheck className="w-4 h-4 text-emerald-400" />,
  contact: <Users className="w-4 h-4 text-cyan-400" />,
  rival: <UserX className="w-4 h-4 text-amber-400" />,
  enemy: <Skull className="w-4 h-4 text-red-400" />,
};

const CAREER_TYPES: PortraitCareerType[] = [
  'navy',
  'marines',
  'scout',
  'merchant',
  'army',
  'agent',
  'noble',
  'drifter',
  'scholar',
  'rogue',
  'citizen',
  'entertainer',
  'other',
];

export default function FinalizeStep({ characterId }: FinalizeStepProps) {
  const router = useRouter();
  const character = useCharacter(characterId);
  const session = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [portrait, setPortrait] = useState<PortraitRecord | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [remixerOpen, setRemixerOpen] = useState(false);
  const {
    generate: generatePortrait,
    isLoading: generatingPortrait,
    error: portraitError,
  } = usePortraitGenerator();

  if (character && !hasInitialized) {
    setName(character.name || '');
    setHasInitialized(true);
  }

  if (!character) return <div className="text-subtle">Loading...</div>;

  const finalTerm = character.terms[character.terms.length - 1];
  const career = getCareer(finalTerm?.careerId || '');
  const rankInfo = career ? getRankInfo(career, finalTerm?.currentRank || 0) : null;

  const connections = character.terms.flatMap((term, termIndex) =>
    term.spawnedEntities.map((e) => ({
      ...e,
      termNumber: termIndex + 1,
    })),
  );

  const handleNameChange = (newName: string) => {
    setName(newName);
    const doc = getYDoc();
    updateCharacterFields(doc, character.id, { name: newName });
  };

  const handleCreateCharacter = async () => {
    if (!name.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const doc = getYDoc();
      const finalData = createCharacterNode(character);
      updateCharacterFields(doc, character.id, { status: 'finalized' });
      localStorage.removeItem('highport_active_character');
      if (portrait) {
        await attachPortraitRecord(finalData.graphNodeId, portrait.id);
        attachPortraitToNode(finalData.graphNodeId, portrait);
      }
      router.push('/graph');
    } catch (error) {
      console.error('Failed to create character node:', error);
      setIsCreating(false);
    }
  };

  const handleGeneratePortrait = async () => {
    if (!session?.campaignId) return;

    const candidateCareer = finalTerm?.careerId as PortraitCareerType | undefined;
    const careerType =
      candidateCareer && CAREER_TYPES.includes(candidateCareer) ? candidateCareer : undefined;

    const tags: Partial<PortraitTags> = {
      story: {
        entity_type: 'traveller',
        importance_level: 'key',
      },
      career: careerType ? { career_type: careerType } : undefined,
    };

    const appearanceText = `Age ${character.age}. ${career?.name || 'Character'} background.`;

    const result = await generatePortrait({
      campaignId: session.campaignId,
      tags,
      appearanceText,
      protected: true,
      sourcePolicy: 'subject_only',
    });

    setPortrait(result);
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
        <h2 className="text-2xl font-bold text-heading mb-6 font-display">Character Complete</h2>

        <BentoGrid minWidth="280px">
          <div>
            <div className="mb-4">
              <label htmlFor="finalize-character-name" className="block text-sm mb-1 text-subtle">
                Character Name
              </label>
              <SciFiInput
                id="finalize-character-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter character name..."
                theme="cyan"
                className="text-xl font-bold"
              />
            </div>

            <div className="flex justify-between text-label">
              <span>
                Age: <span className="text-heading">{character.age}</span>
              </span>
              <span>
                {career?.name} ({character.terms.length} term
                {character.terms.length !== 1 ? 's' : ''})
                {rankInfo && <span className="text-subtle"> • {rankInfo.title}</span>}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-heading mb-3 font-display">Portrait</h3>
            {portrait ? (
              <div className="flex items-center gap-4">
                <img
                  src={portrait.image_url || ''}
                  alt={`Portrait of ${name || 'Character'}`}
                  className="w-24 h-24 rounded-lg object-cover border border-zinc-700"
                />
                <SciFiButton
                  onClick={handleGeneratePortrait}
                  disabled={generatingPortrait || !session?.campaignId}
                  theme="slate"
                  scifiVariant="secondary"
                >
                  Regenerate
                </SciFiButton>
                <SciFiButton
                  onClick={() => setRemixerOpen(true)}
                  disabled={!session?.campaignId}
                  theme="violet"
                  scifiVariant="secondary"
                >
                  Remix
                </SciFiButton>
              </div>
            ) : (
              <div className="flex gap-3">
                {generatingPortrait ? (
                  <div className="w-full flex justify-center">
                    <PortraitGenerationProgress isGenerating={generatingPortrait} />
                  </div>
                ) : (
                  <>
                    <SciFiButton
                      onClick={handleGeneratePortrait}
                      disabled={generatingPortrait || !session?.campaignId}
                      theme="slate"
                      scifiVariant="secondary"
                    >
                      Generate Portrait
                    </SciFiButton>
                    <SciFiButton
                      onClick={() => setLibraryOpen(true)}
                      disabled={!session?.campaignId}
                      theme="slate"
                      scifiVariant="secondary"
                    >
                      Browse Library
                    </SciFiButton>
                  </>
                )}
              </div>
            )}

            {portraitError && (
              <div className="text-red-400 text-xs mt-2">{portraitError.message}</div>
            )}
            {!session?.campaignId && (
              <div className="text-amber-300 text-xs mt-2">
                Portraits require an active session.
              </div>
            )}
          </div>
        </BentoGrid>

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
                story: { entity_type: 'traveller', importance_level: 'key' },
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

        <div className="mb-6">
          <h3 className="text-lg font-bold text-heading mb-3 font-display">Characteristics</h3>
          <BentoGrid minWidth="140px">
            {CHARACTERISTIC_ORDER.map((stat) => {
              const value = character.characteristics[stat] || 0;
              const dm = getCharacteristicModifier(value);
              return (
                <div key={stat} className="text-center">
                  <div className="text-xs mb-1 text-subtle">{stat}</div>
                  <div className="text-2xl font-bold text-heading">{value}</div>
                  <div style={{ color: dm >= 0 ? '#22d3ee' : '#f87171' }} className="text-sm">
                    {dm >= 0 ? '+' : ''}
                    {dm}
                  </div>
                </div>
              );
            })}
          </BentoGrid>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-heading mb-3 font-display">Skills</h3>
          <BentoGrid>
            <div>
              {trainedSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trainedSkills.map((skillStr, i) => {
                    const lastSpaceIndex = skillStr.lastIndexOf(' ');
                    let skillName = skillStr;
                    let skillLevel = 0;
                    if (lastSpaceIndex !== -1) {
                      const levelPart = skillStr.substring(lastSpaceIndex + 1);
                      if (!isNaN(parseInt(levelPart))) {
                        skillName = skillStr.substring(0, lastSpaceIndex);
                        skillLevel = parseInt(levelPart);
                      }
                    }

                    return (
                      <SkillBadge key={i} skill={skillName} level={skillLevel} theme="emerald" />
                    );
                  })}
                </div>
              ) : (
                <div className="text-subtle">No trained skills</div>
              )}
            </div>

            {level0Skills.length > 0 && (
              <div>
                <div className="text-xs mb-2 text-subtle">Level 0:</div>
                <div className="flex flex-wrap gap-2">
                  {level0Skills.map((skill, i) => (
                    <SkillBadge key={i} skill={skill} level={0} theme="slate" />
                  ))}
                </div>
              </div>
            )}
          </BentoGrid>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-heading mb-3 font-display">Benefits</h3>
          <BentoGrid>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-heading">Cr{character.credits.toLocaleString()}</span>
              </div>
              {character.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-cyan-400" />
                  <span className="text-heading">{benefit}</span>
                </div>
              ))}
              {character.benefits.length === 0 && character.credits === 0 && (
                <div className="text-subtle">No benefits accumulated</div>
              )}
            </div>
          </BentoGrid>
        </div>

        {connections.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-heading mb-3 font-display">Connections</h3>
            <BentoGrid>
              <div className="space-y-2">
                {connections.map((conn, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span>
                      {RELATIONSHIP_ICONS[conn.relationship || ''] || (
                        <Circle className="w-4 h-4 text-subtle" />
                      )}
                    </span>
                    <span className="capitalize text-subtle">{conn.relationship}:</span>
                    <span className="text-heading">{conn.name}</span>
                    <span className="text-sm text-subtle">(Term {conn.termNumber})</span>
                  </div>
                ))}
              </div>
            </BentoGrid>
          </div>
        )}
      </GlassPanel>

      <div className="flex justify-between gap-4">
        <SciFiButton onClick={handleBack} scifiVariant="ghost" theme="slate">
          ← Back to Benefits
        </SciFiButton>

        <SciFiButton
          onClick={handleCreateCharacter}
          disabled={isCreating || !name.trim()}
          scifiVariant="primary"
          theme="cyan"
          glow
          className="flex-1"
        >
          {isCreating ? 'Creating...' : 'Create Character & View Graph →'}
        </SciFiButton>
      </div>
    </div>
  );
}
