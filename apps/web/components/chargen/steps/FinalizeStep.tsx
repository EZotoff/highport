'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getYDoc } from '../../../lib/ydoc';
import {
  useCharacter,
  useSession,
  useLifepathProposals,
  useAllCharacters,
  useCrossCharacterLinks as useExistingLinks,
} from '../../../lib/chargen/hooks';
import {
  updateCharacterFields,
  addLifepathProposal,
  resolveLifepathProposal,
  addCrossCharacterLink,
} from '../../../lib/chargen/state';
import { useLifepathReview, useNarrativeAvailable } from '../../../lib/chargen/useNarrative';
import { generateCrossCharacterLinks } from '../../../lib/chargen/narrative';
import { getCharacteristicModifier, getCareer, type CharacteristicSet } from '@highport/mgt2e';
import { findSharedHistory } from '../../../lib/graph/shared-history';
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
import type { AIProvenance, ChargenCharacter, LifepathProposal } from '../../../lib/chargen/types';
import { PortraitLibrary } from '@/components/portrait/PortraitLibrary';
import { PortraitRemixer } from '@/components/portrait/PortraitRemixer';
import { useGMControls } from '../../../lib/chargen/useGMControls';
import { isCanonical, requiresReview, shouldShowDraft } from '../../../lib/chargen/gm-approval';
import { NarrativeUnavailableNotice } from '../NarrativeUnavailableNotice';
interface FinalizeStepProps {
  characterId: string | null;
  currentUserId: string;
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

const CAREER_TYPES = [
  'navy',
  'marine',
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
] as PortraitCareerType[];
const PROPOSAL_TYPE_LABELS: Record<LifepathProposal['type'], string> = {
  'coherence-edit': 'Coherence',
  'npc-connection': 'Connection',
  'plot-hook': 'Hook',
};

const PROPOSAL_TYPE_COLORS: Record<LifepathProposal['type'], string> = {
  'coherence-edit': 'text-amber-400',
  'npc-connection': 'text-cyan-400',
  'plot-hook': 'text-violet-400',
};

function getCharacterFingerprint(character: ChargenCharacter): string {
  return JSON.stringify({
    terms: character.terms,
    skills: character.skills,
    chapters: character.chapters,
  });
}

export default function FinalizeStep({ characterId, currentUserId }: FinalizeStepProps) {
  const router = useRouter();
  const character = useCharacter(characterId);
  const session = useSession();
  const proposals = useLifepathProposals(characterId ?? undefined);
  const { isGM, settings } = useGMControls(currentUserId);
  const gmApprovalMode = settings?.gmApprovalMode ?? 'moderate';
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
  const {
    generate: generateLifepathReview,
    isLoading: isReviewingLifepath,
    error: lifepathReviewError,
    unavailable: isLifepathReviewUnavailable,
  } = useLifepathReview();
  const { isAvailable: isRagAvailable } = useNarrativeAvailable();

  // ---- Cross-character link auto-generation (player-to-player mode) ----

  const allCharacters = useAllCharacters();
  const existingLinks = useExistingLinks();
  const lastGeneratedFingerprintRef = useRef<string | null>(null);

  const generateCrossCharLinks = useCallback(async () => {
    const finalizedChars = allCharacters.filter((c) => c.status === 'finalized');
    if (finalizedChars.length < 2) return;

    const sharedHistory = findSharedHistory(allCharacters);
    const generated = await generateCrossCharacterLinks(allCharacters, sharedHistory, false);

    const doc = getYDoc();
    for (const proposal of generated) {
      addCrossCharacterLink(doc, {
        sourceCharId: proposal.sourceCharId,
        targetCharId: proposal.targetCharId,
        sourceEntityId: proposal.sourceEntityId,
        targetEntityId: proposal.targetEntityId,
        relationship: proposal.relationship,
        description: proposal.description,
      });
    }
  }, [allCharacters]);

  useEffect(() => {
    const mode = session?.settings?.crossCharacterLinkMode;
    if (mode !== 'player-to-player') return;
    if (!character || character.status !== 'finalized') return;

    const finalizedChars = allCharacters.filter((c) => c.status === 'finalized');
    if (finalizedChars.length < 2) return;

    const currentFingerprint = finalizedChars
      .map((c) => c.id)
      .sort()
      .join(',');

    // Skip if we already generated for this exact set of finalized characters
    if (lastGeneratedFingerprintRef.current === currentFingerprint) return;

    // Skip if existing links already cover all finalized characters (dedup)
    const allFinalizedIds = new Set(finalizedChars.map((c) => c.id));
    const coveredIds = new Set<string>();
    for (const link of existingLinks) {
      if (link.status !== 'rejected') {
        coveredIds.add(link.sourceCharId);
        coveredIds.add(link.targetCharId);
      }
    }
    if (allFinalizedIds.size > 0 && [...allFinalizedIds].every((id) => coveredIds.has(id))) {
      lastGeneratedFingerprintRef.current = currentFingerprint;
      return;
    }

    // Trigger generation — update fingerprint before async to prevent
    // concurrent triggers on re-render during the async call
    lastGeneratedFingerprintRef.current = currentFingerprint;
    generateCrossCharLinks().catch((err) => {
      console.error('Failed to generate cross-character links:', err);
      // Reset fingerprint so a future trigger can retry
      lastGeneratedFingerprintRef.current = null;
    });
  }, [
    session?.settings?.crossCharacterLinkMode,
    character,
    allCharacters,
    existingLinks,
    generateCrossCharLinks,
  ]);
  const pendingProposals = proposals.filter((proposal) => proposal.status === 'pending');
  const resolvedProposals = proposals.filter((proposal) => proposal.status !== 'pending');

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
  const currentFingerprint = getCharacterFingerprint(character);
  const reviewVersion = character.reviewVersion ?? 0;
  const lastReviewedFingerprint = character.lastReviewedFingerprint;
  const isReviewUpToDate = reviewVersion > 0 && lastReviewedFingerprint === currentFingerprint;

  const handleReviewLifepath = async () => {
    if (isReviewingLifepath || isReviewUpToDate) return;
    try {
      const generatedProposals = await generateLifepathReview(character, undefined, isGM);
      const doc = getYDoc();
      const status: LifepathProposal['status'] =
        gmApprovalMode === 'lenient' ? 'accepted' : 'pending';
      generatedProposals.forEach((proposal) => {
        addLifepathProposal(doc, {
          characterId: character.id,
          type: proposal.type,
          targetTerm: proposal.targetTerm,
          title: proposal.title,
          description: proposal.description,
          proposedEdit: proposal.proposedEdit,
          status,
        });
      });
      updateCharacterFields(doc, character.id, {
        reviewVersion: reviewVersion + 1,
        lastReviewedFingerprint: currentFingerprint,
      });
    } catch {
      // error surfaced by useLifepathReview
    }
  };

  const handleAcceptProposal = (proposal: LifepathProposal) => {
    const doc = getYDoc();
    resolveLifepathProposal(doc, proposal.id, true);
  };

  const handleRejectProposal = (proposalId: string) => {
    const doc = getYDoc();
    resolveLifepathProposal(doc, proposalId, false);
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
        <div className="mb-6">
          <h3 className="text-lg font-bold text-heading mb-3 font-display">Lifepath Review</h3>
          <div className="space-y-3">
            {isRagAvailable ? (
              <>
                <SciFiButton
                  onClick={handleReviewLifepath}
                  disabled={isReviewingLifepath}
                  theme="violet"
                  scifiVariant="secondary"
                >
                  {isReviewUpToDate ? 'Review Lifepath (up to date)' : 'Review Lifepath'}
                </SciFiButton>
                {isReviewingLifepath && (
                  <div className="flex items-center gap-2 text-subtle">
                    <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing lifepath...
                  </div>
                )}
                {lifepathReviewError && !isLifepathReviewUnavailable && (
                  <div className="text-red-400 text-xs">{lifepathReviewError.message}</div>
                )}
                {isLifepathReviewUnavailable && (
                  <div className="text-amber-300 text-xs">
                    Lifepath review is unavailable. Check the RAG service.
                  </div>
                )}
              </>
            ) : (
              <NarrativeUnavailableNotice />
            )}
            {pendingProposals.length > 0 && (
              <div className="space-y-3">
                {pendingProposals.map((proposal) => {
                  const provenance: AIProvenance<string> = {
                    value: proposal.description,
                    source: 'ai',
                    mode: 'inspiration',
                    status: 'draft',
                    derivedFrom: `lifepath-${proposal.id}`,
                    generatedAt: proposal.generatedAt,
                    pendingReviewBy: 'gm',
                  };
                  const showText = shouldShowDraft(gmApprovalMode, provenance, isGM);
                  const showBadge = requiresReview(provenance, gmApprovalMode);
                  const displayText = showText ? proposal.description : 'Pending GM Review...';

                  return (
                    <div key={proposal.id} className="space-y-2 border border-zinc-800 rounded p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-heading">{proposal.title}</div>
                        <div className="flex items-center gap-2">
                          {showBadge && (
                            <span className="text-xs text-amber-400 font-mono font-bold uppercase tracking-wider bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded">
                              Pending GM Approval
                            </span>
                          )}
                          <span
                            className={`text-xs font-mono font-bold uppercase tracking-wider ${PROPOSAL_TYPE_COLORS[proposal.type]}`}
                          >
                            {PROPOSAL_TYPE_LABELS[proposal.type]}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-subtle">Target term {proposal.targetTerm}</div>
                      <div className="text-sm text-subtle">{displayText}</div>
                      {showText && proposal.proposedEdit && (
                        <div className="text-xs text-amber-300 bg-amber-950/30 p-2 rounded">
                          Proposed edit: {proposal.proposedEdit}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <SciFiButton
                          onClick={() => handleAcceptProposal(proposal)}
                          theme="emerald"
                          scifiVariant="secondary"
                          className="text-xs px-2 py-1 min-h-0"
                        >
                          Accept
                        </SciFiButton>
                        <SciFiButton
                          onClick={() => handleRejectProposal(proposal.id)}
                          theme="slate"
                          scifiVariant="ghost"
                          className="text-xs px-2 py-1 min-h-0"
                        >
                          Reject
                        </SciFiButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {resolvedProposals.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-heading mb-3 font-display">Lifepath Proposals</h3>
            <BentoGrid>
              {resolvedProposals.map((proposal) => {
                const provenance: AIProvenance<string> = {
                  value: proposal.description,
                  source: 'ai',
                  mode: 'inspiration',
                  status:
                    proposal.status === 'accepted'
                      ? 'accepted'
                      : proposal.status === 'rejected'
                        ? 'rejected'
                        : 'draft',
                  derivedFrom: `lifepath-${proposal.id}`,
                  generatedAt: proposal.generatedAt,
                  pendingReviewBy:
                    proposal.status === 'accepted'
                      ? null
                      : proposal.status === 'rejected'
                        ? undefined
                        : 'gm',
                };
                const displayText = shouldShowDraft(gmApprovalMode, provenance, isGM)
                  ? proposal.description
                  : 'Pending GM Review...';
                const showBadge = requiresReview(provenance, gmApprovalMode);
                const accepted = isCanonical(provenance, gmApprovalMode);

                return (
                  <div key={proposal.id} className="space-y-2 border border-zinc-800 rounded p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-heading">{proposal.title}</div>
                      {showBadge && (
                        <span className="text-xs text-amber-400 font-mono font-bold uppercase tracking-wider bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded">
                          Pending GM Approval
                        </span>
                      )}
                      {accepted && (
                        <span className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                          Accepted ✓
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-subtle">{displayText}</div>
                  </div>
                );
              })}
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
