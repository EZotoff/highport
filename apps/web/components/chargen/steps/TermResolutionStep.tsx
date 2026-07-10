'use client';

import type {
  AgingCheckResult,
  CareerEvent,
  CareerMishap,
  CharacteristicSet,
  DiceResult,
  EventSpawn,
  MentalCharacteristicCode,
  PhysicalCharacteristicCode,
  SkillTableEntry,
} from '@highport/mgt2e';
import {
  getCareer,
  getCareerFlavor,
  getCommissionModifier,
  roll1d6,
  rollAgingCheck,
  rollCareerEvent,
  rollCommission,
  rollMishap,
} from '@highport/mgt2e';
import type { GraphEdge } from '@highport/shared/types/graph';
import { useState, useEffect } from 'react';
import { SciFiButton } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { useCharacter } from '../../../lib/chargen/hooks';
import type { VerbosityLevel } from '../../../lib/chargen/narrative';
import { updateCharacterFields } from '../../../lib/chargen/state';
import {
  applySkillGain,
  getRankInfo,
  parseCharacteristicBonus,
  rollAdvancement,
  rollSurvival,
} from '../../../lib/chargen/term-resolution';
import type {
  AIProvenance,
  CareerTermResult,
  ChargenCharacter,
  ChargenStatus,
  SpawnedEntityRef,
} from '../../../lib/chargen/types';
import { useEventNarrative, useNarrativeAvailable } from '../../../lib/chargen/useNarrative';
import { getYDoc } from '../../../lib/ydoc';
import { addEdge } from '../../../lib/yjs-helpers';
import { ChapterCard } from '../ChapterCard';
import ConnectionSuggestions from '../ConnectionSuggestions';
import EntitySpawnForm from '../EntitySpawnForm';
import { NarrativeUnavailableNotice } from '../NarrativeUnavailableNotice';

interface TermResolutionStepProps {
  characterId: string | null;
  verbosity: VerbosityLevel;
}

type TermPhase =
  | 'survival'
  | 'event'
  | 'event_choice'
  | 'skill'
  | 'commission'
  | 'advancement'
  | 'aging'
  | 'complete';

const PHYSICAL_AGING_STATS: PhysicalCharacteristicCode[] = ['STR', 'DEX', 'END'];
const MENTAL_AGING_STATS: MentalCharacteristicCode[] = ['INT', 'EDU', 'SOC'];

export default function TermResolutionStep({ characterId, verbosity }: TermResolutionStepProps) {
  const character = useCharacter(characterId);

  const [phase, setPhase] = useState<TermPhase>('survival');
  const [survivalRoll, setSurvivalRoll] = useState<DiceResult | undefined>();
  const [eventRoll, setEventRoll] = useState<DiceResult | undefined>();
  const [event, setEvent] = useState<CareerEvent | undefined>();
  const [eventAdvancementDM, setEventAdvancementDM] = useState<number>(0);
  const [mishap, setMishap] = useState<CareerMishap | undefined>();
  const [selectedTable, setSelectedTable] = useState<string | undefined>();
  const [skillGained, setSkillGained] = useState<
    { skill: string; specialty?: string } | undefined
  >();
  const [commissionRoll, setCommissionRoll] = useState<DiceResult | undefined>();
  const [commissioned, setCommissioned] = useState<boolean | undefined>();
  const [commissionSkipped, setCommissionSkipped] = useState(false);
  const [advancementRoll, setAdvancementRoll] = useState<DiceResult | undefined>();
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [agingCheck, setAgingCheck] = useState<AgingCheckResult | undefined>();
  const [selectedPhysicalLosses, setSelectedPhysicalLosses] = useState<
    PhysicalCharacteristicCode[]
  >([]);
  const [selectedMentalLosses, setSelectedMentalLosses] = useState<MentalCharacteristicCode[]>([]);
  const [pendingAgingStatus, setPendingAgingStatus] = useState<ChargenStatus | undefined>();
  const [pendingSpawns, setPendingSpawns] = useState<EventSpawn[]>([]);
  const [currentSpawnIndex, setCurrentSpawnIndex] = useState(0);

  const [generatedDescription, setGeneratedDescription] = useState<string | undefined>();
  const [descriptionEditorOpen, setDescriptionEditorOpen] = useState(false);
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const [guidanceText, setGuidanceText] = useState('');

  const { isAvailable: narrativeAvailable } = useNarrativeAvailable();
  const {
    generate: generateNarrative,
    isLoading: narrativeLoading,
    error: narrativeError,
    unavailable: narrativeUnavailable,
  } = useEventNarrative();

  // biome-ignore lint/correctness/useExhaustiveDependencies: only run when character ID or term number changes
  useEffect(() => {
    if (character) {
      const term = character.terms[character.terms.length - 1];
      if (term) {
        const descField = term.eventDescription;
        if (descField) {
          if (typeof descField === 'object' && descField !== null && 'value' in descField) {
            setGeneratedDescription(descField.value);
            setDescriptionEditorOpen(descField.status === 'draft' || descField.status === 'edited');
          } else {
            setGeneratedDescription(descField as string);
            setDescriptionEditorOpen(false);
          }
        } else {
          setGeneratedDescription(undefined);
          setDescriptionEditorOpen(false);
        }
      }
    }
  }, [characterId, character?.terms[character?.terms.length - 1]?.termNumber]);

  if (!character) return <div className="text-subtle">Loading character...</div>;

  const currentTerm = character.terms[character.terms.length - 1];
  if (!currentTerm) return <div className="text-red-400">Error: No active term found.</div>;

  const career = getCareer(currentTerm.careerId);
  const assignment = career?.assignments.find((a) => a.id === currentTerm.assignmentId);

  if (!career || !assignment)
    return <div className="text-red-400">Error: Invalid career or assignment.</div>;

  const careerTermNumber = character.terms.filter((term) => term.careerId === career.id).length;
  const isCommissioned = currentTerm.commissioned === true;
  const commissionEligibility = getCommissionModifier(
    character.characteristics.SOC || 0,
    careerTermNumber,
  );
  const canAttemptCommission =
    career.officerRanks !== undefined && !isCommissioned && commissionEligibility.eligible;
  const shouldRenderCommission =
    canAttemptCommission || commissionRoll !== undefined || commissionSkipped;
  const conscriptionSurvivalDM =
    currentTerm.drafted === true ? (currentTerm.survivalDmBonus ?? 0) : 0;

  const finishTerm = (termsOverride?: CareerTermResult[], statusAfterAging?: ChargenStatus) => {
    const doc = getYDoc();
    const finalAge = character.age + 4;
    const totalTermsCompleted = character.terms.length;
    const updatedTerms = [...(termsOverride ?? character.terms)];

    if (finalAge >= 34) {
      const check = rollAgingCheck(character.characteristics.END || 0, totalTermsCompleted);
      const currentTermIndex = character.terms.length - 1;
      updatedTerms[currentTermIndex] = {
        ...updatedTerms[currentTermIndex],
        agingRoll: check.roll,
        agingEffect: check.tier,
      };

      setAgingCheck(check);
      setSelectedPhysicalLosses([]);
      setSelectedMentalLosses([]);
      setPendingAgingStatus(statusAfterAging);
      updateCharacterFields(doc, character.id, {
        age: finalAge,
        terms: updatedTerms,
      });
      setPhase('aging');
      return;
    }

    const updates: Partial<ChargenCharacter> = {
      age: finalAge,
      terms: updatedTerms,
    };
    if (statusAfterAging) updates.status = statusAfterAging;
    updateCharacterFields(doc, character.id, updates);

    if (!statusAfterAging) {
      setPhase('complete');
    }
  };

  const continueAfterAging = () => {
    const doc = getYDoc();
    if (pendingAgingStatus) {
      updateCharacterFields(doc, character.id, { status: pendingAgingStatus });
      return;
    }
    setPhase('complete');
  };

  const togglePhysicalLoss = (stat: PhysicalCharacteristicCode) => {
    setSelectedPhysicalLosses((selected) => {
      if (selected.includes(stat)) return selected.filter((value) => value !== stat);
      if (agingCheck && selected.length >= agingCheck.physicalLosses) return selected;
      return [...selected, stat];
    });
  };

  const toggleMentalLoss = (stat: MentalCharacteristicCode) => {
    setSelectedMentalLosses((selected) => {
      if (selected.includes(stat)) return selected.filter((value) => value !== stat);
      if (agingCheck && selected.length >= agingCheck.mentalLosses) return selected;
      return [...selected, stat];
    });
  };

  const applyAgingLosses = () => {
    if (!agingCheck) return;
    if (selectedPhysicalLosses.length !== agingCheck.physicalLosses) return;
    if (selectedMentalLosses.length !== agingCheck.mentalLosses) return;

    const doc = getYDoc();
    const newCharacteristics = { ...character.characteristics };

    selectedPhysicalLosses.forEach((stat) => {
      newCharacteristics[stat] = Math.max(0, (newCharacteristics[stat] || 0) - 1);
    });
    selectedMentalLosses.forEach((stat) => {
      newCharacteristics[stat] = Math.max(0, (newCharacteristics[stat] || 0) - 1);
    });

    const updatedTerms = [...character.terms];
    const currentTermIndex = character.terms.length - 1;
    updatedTerms[currentTermIndex] = {
      ...updatedTerms[currentTermIndex],
      agingPhysicalLosses: selectedPhysicalLosses,
      agingMentalLosses: selectedMentalLosses,
    };

    updateCharacterFields(doc, character.id, {
      characteristics: newCharacteristics,
      terms: updatedTerms,
    });

    continueAfterAging();
  };

  const handleSurvivalRoll = () => {
    const roll = rollSurvival(character, assignment, conscriptionSurvivalDM);
    setSurvivalRoll(roll);

    const survived = roll.total >= assignment.survival.target;

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    updatedTerms[character.terms.length - 1] = {
      ...currentTerm,
      survivalRoll: roll,
      survived,
    };

    updateCharacterFields(doc, character.id, { terms: updatedTerms });

    if (survived) {
      setTimeout(() => setPhase('event'), 1000);
    } else {
      const mishapResult = rollMishap(career);
      setMishap(mishapResult.mishap);

      updatedTerms[character.terms.length - 1] = {
        ...updatedTerms[character.terms.length - 1],
        mishap: mishapResult.mishap,
      };
      updateCharacterFields(doc, character.id, { terms: updatedTerms });
    }
  };

  const handleEventRoll = () => {
    const roll = rollCareerEvent(career);
    setEventRoll(roll.roll);
    setEvent(roll.event);

    if (roll.event.spawns && roll.event.spawns.length > 0) {
      setPendingSpawns(roll.event.spawns);
      setCurrentSpawnIndex(0);
    }

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    updatedTerms[character.terms.length - 1] = {
      ...currentTerm,
      eventRoll: roll.roll,
      event: roll.event,
    };
    updateCharacterFields(doc, character.id, { terms: updatedTerms });

    setPhase('event_choice');
  };

  const confirmEvent = () => {
    setPhase('skill');
  };

  const handleSpawnComplete = (entity: SpawnedEntityRef) => {
    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const term = updatedTerms[character.terms.length - 1];

    if (!term.spawnedEntities) term.spawnedEntities = [];
    term.spawnedEntities.push(entity);

    updateCharacterFields(doc, character.id, { terms: updatedTerms });

    if (currentSpawnIndex < pendingSpawns.length - 1) {
      setCurrentSpawnIndex((prev) => prev + 1);
    } else {
      setPendingSpawns([]);
      setCurrentSpawnIndex(0);
    }
  };

  const handleSpawnSkip = () => {
    if (currentSpawnIndex < pendingSpawns.length - 1) {
      setCurrentSpawnIndex((prev) => prev + 1);
    } else {
      setPendingSpawns([]);
      setCurrentSpawnIndex(0);
    }
  };

  const handleSkillTableSelect = (tableType: string) => {
    setSelectedTable(tableType);
  };

  const handleSkillRoll = () => {
    if (!selectedTable) return;

    const roll = roll1d6();

    let table: SkillTableEntry[] = [];
    switch (selectedTable) {
      case 'personal':
        table = career.skillTables.personal;
        break;
      case 'service':
        table = career.skillTables.service;
        break;
      case 'advanced':
        table = career.skillTables.advanced;
        break;
      case 'assignment':
        table = assignment.skillTable;
        break;
      case 'officer':
        table = career.skillTables.officer || [];
        break;
    }

    const entry = table.find((e) => e.roll === roll.total);
    if (entry) {
      const skillName = entry.skill;
      const statBonus = parseCharacteristicBonus(skillName);

      const doc = getYDoc();
      if (statBonus) {
        const newStats = { ...character.characteristics };
        const statKey = statBonus.stat as keyof CharacteristicSet;
        if (typeof newStats[statKey] === 'number') {
          newStats[statKey] = (newStats[statKey] as number) + statBonus.value;
        } else {
          newStats[statKey] = statBonus.value;
        }
        updateCharacterFields(doc, character.id, { characteristics: newStats });
        setSkillGained({ skill: skillName });
      } else {
        const newSkills = applySkillGain(character.skills, skillName);
        updateCharacterFields(doc, character.id, { skills: newSkills });
        setSkillGained({ skill: skillName });
      }

      const updatedTerms = [...character.terms];
      const term = updatedTerms[character.terms.length - 1];
      term.skillsGained.push({ skill: skillName, level: 1 });
      updateCharacterFields(doc, character.id, { terms: updatedTerms });
    }

    setTimeout(() => setPhase(canAttemptCommission ? 'commission' : 'advancement'), 1500);
  };

  const handleSkipCommission = () => {
    setCommissionSkipped(true);
    setPhase('advancement');
  };

  const handleCommissionRoll = () => {
    if (!canAttemptCommission) return;

    const roll = rollCommission(character.characteristics.SOC || 0, careerTermNumber);
    const succeeded = roll.total >= 8;
    setCommissionRoll(roll);
    setCommissioned(succeeded);
    setCommissionSkipped(false);

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const term = updatedTerms[character.terms.length - 1];

    term.commissionRoll = roll;
    term.commissioned = succeeded;

    if (succeeded) {
      term.currentRank = 1;
      term.rankGained = 1;

      const rankInfo = getRankInfo(career, 1, true);
      if (rankInfo?.skill) {
        const newSkills = applySkillGain(character.skills, rankInfo.skill);
        updateCharacterFields(doc, character.id, { skills: newSkills });
        term.skillsGained.push({ skill: rankInfo.skill, level: 1 });
      }
    }

    updateCharacterFields(doc, character.id, { terms: updatedTerms });

    if (succeeded) {
      setTimeout(() => finishTerm(updatedTerms), 1500);
    } else {
      setTimeout(() => setPhase('advancement'), 1500);
    }
  };

  const handleAdvancementRoll = () => {
    const roll = rollAdvancement(character, assignment, eventAdvancementDM);
    setAdvancementRoll(roll);

    const isPromoted = roll.total >= assignment.advancement.target;
    setAdvanced(isPromoted);

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const term = updatedTerms[character.terms.length - 1];

    term.advancementRoll = roll;
    term.advanced = isPromoted;

    if (isPromoted) {
      const newRank = term.currentRank + 1;
      term.rankGained = 1;
      term.currentRank = newRank;

      const rankInfo = getRankInfo(career, newRank, currentTerm.commissioned ?? false);
      if (rankInfo?.skill) {
        const newSkills = applySkillGain(character.skills, rankInfo.skill);
        updateCharacterFields(doc, character.id, { skills: newSkills });
        term.skillsGained.push({ skill: rankInfo.skill, level: 1 });
      }
    }

    updateCharacterFields(doc, character.id, { terms: updatedTerms });
    finishTerm(updatedTerms);
  };

  const handleContinue = () => {
    const doc = getYDoc();

    const newTerm: CareerTermResult = {
      termNumber: character.terms.length + 1,
      careerId: career.id,
      assignmentId: assignment.id,
      startAge: character.age,
      survived: false,
      advanced: false,
      currentRank: currentTerm.currentRank,
      commissioned: currentTerm.commissioned === true,
      skillsGained: [],
      spawnedEntities: [],
    };

    updateCharacterFields(doc, character.id, {
      terms: [...character.terms, newTerm],
      currentTermIndex: character.terms.length,
      status: 'term_resolution',
    });

    setPhase('survival');
    setSurvivalRoll(undefined);
    setEventRoll(undefined);
    setEvent(undefined);
    setEventAdvancementDM(0);
    setSkillGained(undefined);
    setCommissionRoll(undefined);
    setCommissioned(undefined);
    setCommissionSkipped(false);
    setAdvancementRoll(undefined);
    setAdvanced(false);
    setAgingCheck(undefined);
    setSelectedPhysicalLosses([]);
    setSelectedMentalLosses([]);
    setPendingAgingStatus(undefined);
  };

  const handleMusterOut = () => {
    const doc = getYDoc();
    updateCharacterFields(doc, character.id, {
      status: 'mustering_out',
    });
  };

  const handleForcedMusterOut = () => {
    const updatedTerms = [...character.terms];
    if (mishap) {
      updatedTerms[character.terms.length - 1] = {
        ...updatedTerms[character.terms.length - 1],
        mishap,
      };
    }
    finishTerm(updatedTerms, 'career_selection');
  };

  const handleGenerateDescription = async (guidance?: string) => {
    if (!event || !character) return;

    try {
      const result = await generateNarrative({
        eventText: event.description,
        career: career.id,
        assignment: assignment.id,
        term: character.terms.length,
        characterContext: {
          name: character.name,
          characteristics: character.characteristics as unknown as Record<string, number>,
          priorEvents: character.terms
            .slice(0, -1)
            .map((t) => t.event?.description)
            .filter(Boolean) as string[],
        },
        verbosity,
        guidance: guidance || undefined,
      });

      const doc = getYDoc();
      const updatedTerms = [...character.terms];
      const currentTermIndex = character.terms.length - 1;

      const provenance: AIProvenance<string> = {
        value: result.description,
        source: 'ai',
        mode: verbosity,
        status: 'draft',
        derivedFrom: `event-roll-${eventRoll?.total ?? 'unknown'}`,
        generatedAt: Date.now(),
      };

      updatedTerms[currentTermIndex] = {
        ...updatedTerms[currentTermIndex],
        eventDescription: provenance,
      };

      updateCharacterFields(doc, character.id, { terms: updatedTerms });

      setGeneratedDescription(result.description);
      setDescriptionEditorOpen(true);
      setGuidanceText('');
      setGuidanceExpanded(false);

      if (result.suggestedEntities && result.suggestedEntities.length > 0) {
        const validRelationships = ['ally', 'contact', 'rival', 'enemy'];
        const mapped: EventSpawn[] = result.suggestedEntities.map((e) => ({
          type: e.type,
          relationship:
            e.relationship && validRelationships.includes(e.relationship)
              ? (e.relationship as 'ally' | 'contact' | 'rival' | 'enemy')
              : undefined,
          required: false,
        }));
        setPendingSpawns((prev) => [...prev, ...mapped]);
        setCurrentSpawnIndex(0);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'RagUnavailableError') {
        setGeneratedDescription('');
        setDescriptionEditorOpen(true);
      } else {
        console.error(e);
      }
    }
  };

  const handleRejectDescription = () => {
    if (!generatedDescription || !character) return;

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const currentTermIndex = character.terms.length - 1;

    const provenance: AIProvenance<string> = {
      value: generatedDescription,
      source: 'ai',
      mode: verbosity,
      status: 'rejected',
      derivedFrom: `event-roll-${eventRoll?.total ?? 'unknown'}`,
      generatedAt: Date.now(),
    };

    updatedTerms[currentTermIndex] = {
      ...updatedTerms[currentTermIndex],
      eventDescription: provenance,
    };

    updateCharacterFields(doc, character.id, { terms: updatedTerms });
    setGeneratedDescription(undefined);
    setDescriptionEditorOpen(false);
  };

  const handleEditDescription = () => {
    if (!character || !currentTerm?.eventDescription) return;

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const currentTermIndex = character.terms.length - 1;

    const currentDesc = currentTerm.eventDescription;
    const value =
      typeof currentDesc === 'object' && currentDesc !== null && 'value' in currentDesc
        ? currentDesc.value
        : (currentDesc as string);

    const provenance: AIProvenance<string> = {
      value,
      source: 'ai',
      mode: verbosity,
      status: 'draft',
      derivedFrom: `event-roll-${eventRoll?.total ?? 'unknown'}`,
      generatedAt: Date.now(),
    };

    updatedTerms[currentTermIndex] = {
      ...updatedTerms[currentTermIndex],
      eventDescription: provenance,
    };

    updateCharacterFields(doc, character.id, { terms: updatedTerms });
    setGeneratedDescription(value);
    setDescriptionEditorOpen(true);
  };

  const handleAcceptDescription = () => {
    if (!generatedDescription || !character) return;

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const currentTermIndex = character.terms.length - 1;

    const provenance: AIProvenance<string> = {
      value: generatedDescription,
      source: 'ai',
      mode: verbosity,
      status: 'accepted',
      derivedFrom: `event-roll-${eventRoll?.total ?? 'unknown'}`,
      generatedAt: Date.now(),
    };

    updatedTerms[currentTermIndex] = {
      ...updatedTerms[currentTermIndex],
      eventDescription: provenance,
    };

    updateCharacterFields(doc, character.id, { terms: updatedTerms });
  };

  const handleAcceptConnection = (connection: {
    source: string;
    target: string;
    relationship: string;
    description: string;
  }) => {
    const doc = getYDoc();

    const edge: GraphEdge = {
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source_id: connection.source,
      target_id: connection.target,
      relation_label: connection.relationship,
      type: 'directional',
      weight: 1,
      style: 'solid',
      color: '#8b5cf6',
      hidden: false,
    };

    addEdge(doc, edge);
  };

  const renderSurvival = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-heading font-display">Phase 1: Survival</h3>
        <span className="text-subtle font-mono">
          {assignment.survival.characteristic} {assignment.survival.target}+
        </span>
      </div>

      {!survivalRoll ? (
        <div className="text-center py-8">
          <p className="text-subtle mb-6">
            Make a survival roll to avoid mishaps and continue your career.
          </p>
          {conscriptionSurvivalDM > 0 && (
            <p className="text-cyan-300 font-mono text-sm mb-6">
              Conscription survival DM +{conscriptionSurvivalDM}
            </p>
          )}
          <SciFiButton theme="cyan" glow onClick={handleSurvivalRoll}>
            Roll Survival
          </SciFiButton>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
          <div className="text-3xl font-mono font-bold mb-2">
            <span
              className={
                survivalRoll.total >= assignment.survival.target ? 'text-green-400' : 'text-red-400'
              }
            >
              {survivalRoll.total}
            </span>
          </div>
          <div className="text-sm text-subtle mb-2">
            Roll: {survivalRoll.rolls[0]} + {survivalRoll.rolls[1]} + DM {survivalRoll.modifier}
          </div>
          {conscriptionSurvivalDM > 0 && (
            <div className="text-xs text-cyan-300 mb-2">
              Includes conscription survival DM +{conscriptionSurvivalDM}
            </div>
          )}
          {survivalRoll.total >= assignment.survival.target ? (
            <div className="text-green-400 font-bold">✓ SURVIVED</div>
          ) : (
            <div className="space-y-4">
              <div className="text-red-400 font-bold">✗ MISHAP</div>
              {mishap && (
                <div className="bg-red-900/20 p-4 rounded text-default">{mishap.description}</div>
              )}
              <SciFiButton onClick={handleForcedMusterOut} scifiVariant="destructive">
                Accept Mishap & Leave Career
              </SciFiButton>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEvent = () => {
    const flavorText = event
      ? getCareerFlavor(career.id, String(event.roll), currentTerm.termNumber)
      : undefined;
    const eventDescriptionField = currentTerm?.eventDescription;
    let descriptionStatus: 'none' | 'draft' | 'accepted' | 'rejected' | 'edited' = 'none';
    if (eventDescriptionField) {
      if (
        typeof eventDescriptionField === 'object' &&
        eventDescriptionField !== null &&
        'value' in eventDescriptionField
      ) {
        descriptionStatus = eventDescriptionField.status || 'accepted';
      } else {
        descriptionStatus = 'accepted';
      }
    }

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
        <h3 className="text-xl font-bold text-heading mb-4 font-display">Phase 2: Career Event</h3>

        {!eventRoll ? (
          <div className="text-center">
            <SciFiButton theme="cyan" glow onClick={handleEventRoll}>
              Roll Event
            </SciFiButton>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-subtle font-mono text-sm border-b border-zinc-800 pb-2">
              <span>Roll: {eventRoll.total}</span>
            </div>
            {event && (
              <div className="space-y-2">
                {flavorText && flavorText !== event.description && (
                  <div className="text-label italic text-base">{flavorText}</div>
                )}
                <div className="text-heading text-lg">{event.description}</div>
              </div>
            )}

            {event && narrativeAvailable && (
              <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded">
                {descriptionStatus === 'none' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-subtle">AI Description</span>
                    <SciFiButton
                      onClick={() => handleGenerateDescription()}
                      disabled={narrativeLoading}
                      theme="violet"
                      scifiVariant="secondary"
                      size="sm"
                    >
                      {narrativeLoading ? 'Generating...' : 'Generate Description'}
                    </SciFiButton>
                  </div>
                )}

                {descriptionStatus === 'accepted' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-subtle">AI Description</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                          Accepted ✓
                        </span>
                        <SciFiButton
                          onClick={handleEditDescription}
                          theme="slate"
                          scifiVariant="secondary"
                          size="sm"
                        >
                          Edit
                        </SciFiButton>
                      </div>
                    </div>
                    <div className="text-default italic text-sm bg-zinc-900/30 border border-zinc-800/50 rounded p-3">
                      {generatedDescription}
                    </div>
                  </div>
                )}

                {descriptionStatus === 'rejected' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-400 font-mono font-bold uppercase tracking-wider bg-red-950/50 border border-red-900/50 px-2 py-0.5 rounded">
                      Rejected
                    </span>
                    <SciFiButton
                      onClick={() => handleGenerateDescription()}
                      disabled={narrativeLoading}
                      theme="violet"
                      scifiVariant="secondary"
                      size="sm"
                    >
                      {narrativeLoading ? 'Generating...' : 'Generate New'}
                    </SciFiButton>
                  </div>
                )}

                {(descriptionStatus === 'draft' || descriptionStatus === 'edited') && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-subtle">AI Description (Draft)</span>
                      <SciFiButton
                        onClick={() => handleGenerateDescription()}
                        disabled={narrativeLoading}
                        theme="violet"
                        scifiVariant="secondary"
                        size="sm"
                      >
                        {narrativeLoading ? 'Generating...' : 'Regenerate'}
                      </SciFiButton>
                    </div>

                    {narrativeUnavailable ? (
                      <NarrativeUnavailableNotice />
                    ) : narrativeError ? (
                      <div className="text-red-400 text-sm mb-2">{narrativeError.message}</div>
                    ) : null}

                    <div className="space-y-3">
                      <textarea
                        aria-label="Event narrative description"
                        value={generatedDescription || ''}
                        onChange={(e) => setGeneratedDescription(e.target.value)}
                        className="w-full min-h-[80px] bg-zinc-950 border border-zinc-700 rounded p-3 text-default italic resize-y focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 focus:border-cyan-500"
                        placeholder="Generated description will appear here..."
                      />

                      <div className="flex justify-between items-center gap-2">
                        <SciFiButton
                          onClick={() => setGuidanceExpanded(!guidanceExpanded)}
                          theme="slate"
                          scifiVariant="secondary"
                          size="sm"
                        >
                          {guidanceExpanded ? 'HIDE GUIDANCE' : 'REFINE WITH GUIDANCE'}
                        </SciFiButton>

                        <div className="flex gap-2">
                          <SciFiButton
                            onClick={handleRejectDescription}
                            theme="red"
                            scifiVariant="secondary"
                            size="sm"
                          >
                            REJECT
                          </SciFiButton>
                          <SciFiButton
                            onClick={handleAcceptDescription}
                            theme="emerald"
                            scifiVariant="secondary"
                            size="sm"
                          >
                            Accept & Save
                          </SciFiButton>
                        </div>
                      </div>

                      {guidanceExpanded && (
                        <div className="space-y-3 pt-3 border-t border-zinc-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div>
                            <label
                              htmlFor="guidance-textarea"
                              className="text-[10px] uppercase tracking-[0.2em] mb-2 block font-bold"
                              style={{ color: THEME_HEX.cyan }}
                            >
                              Guidance
                            </label>
                            <textarea
                              id="guidance-textarea"
                              className="w-full h-24 bg-zinc-950 border rounded-lg p-3 text-sm focus:outline-none focus:ring-1 transition-all duration-200 resize-none"
                              style={
                                {
                                  borderColor: THEME_HEX.cyan + '40',
                                  '--tw-ring-color': THEME_HEX.cyan + '80',
                                } as React.CSSProperties
                              }
                              placeholder="Tell the AI what to change: e.g., 'make it darker', 'add a specific NPC', 'focus on the military aspect'"
                              value={guidanceText}
                              onChange={(e) => setGuidanceText(e.target.value)}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = THEME_HEX.cyan;
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = THEME_HEX.cyan + '40';
                              }}
                            />
                          </div>
                          <SciFiButton
                            className="w-full"
                            theme="cyan"
                            onClick={() => handleGenerateDescription(guidanceText)}
                            disabled={narrativeLoading || !guidanceText.trim()}
                          >
                            {narrativeLoading ? 'REGENERATING...' : 'REGENERATE'}
                          </SciFiButton>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {pendingSpawns.length > 0 && event && eventRoll ? (
              <EntitySpawnForm
                spawn={pendingSpawns[currentSpawnIndex]}
                characterId={character.id}
                termNumber={character.terms.length}
                eventRoll={eventRoll.total}
                onComplete={handleSpawnComplete}
                onSkip={handleSpawnSkip}
                verbosity={verbosity}
                career={career.id}
                characterName={character.name || 'Character'}
              />
            ) : (
              phase === 'event_choice' && (
                <div className="mt-4 pt-4 border-t border-zinc-800">
                  <SciFiButton
                    onClick={confirmEvent}
                    theme="slate"
                    scifiVariant="ghost"
                    className="w-full"
                  >
                    Continue
                  </SciFiButton>
                </div>
              )
            )}

            {/* Show connection suggestions when we have multiple spawned entities */}
            {currentTerm.spawnedEntities && currentTerm.spawnedEntities.length >= 2 && (
              <ConnectionSuggestions
                entities={currentTerm.spawnedEntities}
                characterName={character.name}
                characterId={character.id}
                careerHistory={character.terms.map((t) => t.careerId)}
                dismissedSuggestions={character.dismissedSuggestions ?? []}
                onAccept={handleAcceptConnection}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSkill = () => (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4"
      data-testid="skill-table-container"
    >
      <h3 className="text-xl font-bold text-heading mb-4 font-display">Phase 3: Skill Training</h3>

      {!selectedTable && !skillGained ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'personal', name: 'Personal Development' },
            { id: 'service', name: 'Service Skills' },
            { id: 'advanced', name: 'Advanced Education', minEdu: 8 },
            { id: 'assignment', name: 'Assignment Skills' },
            { id: 'officer', name: 'Officer Skills', officerOnly: true },
          ].map((table) => (
            <SciFiButton
              key={table.id}
              disabled={
                (table.id === 'advanced' &&
                  (character.characteristics.EDU || 0) < (table.minEdu || 0)) ||
                (table.id === 'officer' && currentTerm.commissioned !== true)
              }
              onClick={() => handleSkillTableSelect(table.id)}
              theme="slate"
              scifiVariant="secondary"
              className="p-3 h-auto text-sm font-medium"
              data-testid={`skill-table-${
                table.id === 'personal'
                  ? 'personal-development'
                  : table.id === 'service'
                    ? 'service-skills'
                    : table.id === 'advanced'
                      ? 'advanced-education'
                      : table.id === 'assignment'
                        ? 'assignment-skills'
                        : 'officer'
              }`}
            >
              {table.name}
            </SciFiButton>
          ))}
        </div>
      ) : !skillGained ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-label font-bold capitalize">{selectedTable} Table</h4>
            <SciFiButton
              onClick={() => setSelectedTable(undefined)}
              theme="slate"
              scifiVariant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
            >
              Change Table
            </SciFiButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <SciFiButton theme="cyan" glow onClick={handleSkillRoll}>
                Roll 1d6
              </SciFiButton>
              <div className="text-center text-xs text-subtle">
                OR Pick Specific Skill (House Rule)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-900/20 border border-green-800 rounded p-4 text-center">
          <div className="text-green-400 font-bold text-lg mb-1">Skill Gained</div>
          <div className="text-heading text-2xl capitalize">{skillGained.skill}</div>
        </div>
      )}
    </div>
  );

  const renderCommission = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-heading font-display">Phase 4: Commission</h3>
        <span className="text-subtle font-mono">SOC 8+</span>
      </div>

      {commissionRoll ? (
        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
          <div className="text-3xl font-mono font-bold mb-2">
            <span className={commissioned ? 'text-green-400' : 'text-subtle'}>
              {commissionRoll.total}
            </span>
          </div>
          <div className="text-sm text-subtle mb-2">
            Roll: {commissionRoll.rolls[0]} + {commissionRoll.rolls[1]} + DM{' '}
            {commissionRoll.modifier}
          </div>
          {commissioned ? (
            <div className="text-green-400 font-bold">
              ✓ COMMISSIONED as {getRankInfo(career, 1, true)?.title || 'Officer Rank 1'}
            </div>
          ) : (
            <div className="text-subtle font-bold">NO COMMISSION — Advancement still available</div>
          )}
        </div>
      ) : isCommissioned ? (
        <div className="bg-cyan-900/20 border border-cyan-800 rounded p-4 text-center">
          <div className="text-cyan-300 font-bold">Already Commissioned</div>
          <div className="text-subtle text-sm mt-1">Continue to officer advancement.</div>
        </div>
      ) : commissionSkipped ? (
        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
          <div className="text-subtle font-bold">Commission skipped for this term.</div>
        </div>
      ) : canAttemptCommission ? (
        <div className="space-y-4 text-center">
          <p className="text-subtle">
            Attempt to earn an officer commission. Success moves you to Officer Rank 1 and skips
            advancement this term.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-subtle font-mono">
            <span>
              SOC DM {commissionEligibility.socDM >= 0 ? '+' : ''}
              {commissionEligibility.socDM}
            </span>
            {commissionEligibility.termPenalty > 0 && (
              <span>Term Penalty -{commissionEligibility.termPenalty}</span>
            )}
            <span>
              Total DM {commissionEligibility.modifier >= 0 ? '+' : ''}
              {commissionEligibility.modifier}
            </span>
          </div>
          <div className="flex gap-3 justify-center">
            <SciFiButton theme="cyan" glow onClick={handleCommissionRoll}>
              Attempt Commission
            </SciFiButton>
            <SciFiButton theme="slate" scifiVariant="ghost" onClick={handleSkipCommission}>
              Skip Commission
            </SciFiButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <p className="text-subtle">
            {commissionEligibility.reason || 'This career does not offer an officer commission.'}
          </p>
          <SciFiButton theme="slate" scifiVariant="ghost" onClick={handleSkipCommission}>
            Skip Commission
          </SciFiButton>
        </div>
      )}
    </div>
  );

  const renderAdvancement = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-heading font-display">Phase 5: Advancement</h3>
        <span className="text-subtle font-mono">
          {assignment.advancement.characteristic} {assignment.advancement.target}+
        </span>
      </div>

      {!advancementRoll ? (
        <div className="text-center">
          <p className="text-subtle mb-4">Roll for promotion to the next rank.</p>
          <SciFiButton theme="cyan" glow onClick={handleAdvancementRoll}>
            Roll Advancement
          </SciFiButton>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
          <div className="text-3xl font-mono font-bold mb-2">
            <span className={advanced ? 'text-green-400' : 'text-subtle'}>
              {advancementRoll.total}
            </span>
          </div>
          <div className="text-sm text-subtle mb-2">
            Roll: {advancementRoll.rolls[0]} + {advancementRoll.rolls[1]} + DM{' '}
            {advancementRoll.modifier}
          </div>
          {advanced ? (
            <div className="text-green-400 font-bold">
              ✓ PROMOTED to Rank {currentTerm.currentRank}
            </div>
          ) : (
            <div className="text-subtle font-bold">NO PROMOTION</div>
          )}
        </div>
      )}
    </div>
  );

  const renderAging = () => {
    if (!agingCheck) return null;

    const needsChoices = agingCheck.physicalLosses > 0 || agingCheck.mentalLosses > 0;
    const canApplyLosses =
      selectedPhysicalLosses.length === agingCheck.physicalLosses &&
      selectedMentalLosses.length === agingCheck.mentalLosses;

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-heading font-display">Aging Check</h3>
          <span className="text-subtle font-mono">Age {character.age}</span>
        </div>

        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center mb-4">
          <div className="text-3xl font-mono font-bold mb-2">
            <span className={needsChoices ? 'text-amber-400' : 'text-green-400'}>
              {agingCheck.roll.total}
            </span>
          </div>
          <div className="text-sm text-subtle mb-2">
            Roll: {agingCheck.roll.rolls[0]} + {agingCheck.roll.rolls[1]} + DM{' '}
            {agingCheck.roll.modifier}
          </div>
          <div className={needsChoices ? 'text-amber-300 font-bold' : 'text-green-400 font-bold'}>
            {agingCheck.description}
          </div>
        </div>

        {agingCheck.physicalLosses > 0 && (
          <div className="mb-4">
            <h4 className="text-label font-bold mb-2">
              Choose {agingCheck.physicalLosses} physical characteristic
              {agingCheck.physicalLosses > 1 ? 's' : ''} to reduce
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {PHYSICAL_AGING_STATS.map((stat) => (
                <SciFiButton
                  key={stat}
                  theme={selectedPhysicalLosses.includes(stat) ? 'amber' : 'slate'}
                  scifiVariant={selectedPhysicalLosses.includes(stat) ? 'outline' : 'secondary'}
                  onClick={() => togglePhysicalLoss(stat)}
                >
                  {stat} {character.characteristics[stat]}
                </SciFiButton>
              ))}
            </div>
          </div>
        )}

        {agingCheck.mentalLosses > 0 && (
          <div className="mb-4">
            <h4 className="text-label font-bold mb-2">
              Choose {agingCheck.mentalLosses} mental/social characteristic to reduce
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {MENTAL_AGING_STATS.map((stat) => (
                <SciFiButton
                  key={stat}
                  theme={selectedMentalLosses.includes(stat) ? 'amber' : 'slate'}
                  scifiVariant={selectedMentalLosses.includes(stat) ? 'outline' : 'secondary'}
                  onClick={() => toggleMentalLoss(stat)}
                >
                  {stat} {character.characteristics[stat]}
                </SciFiButton>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          {needsChoices ? (
            <SciFiButton theme="amber" glow disabled={!canApplyLosses} onClick={applyAgingLosses}>
              Apply Aging Effects
            </SciFiButton>
          ) : (
            <SciFiButton theme="cyan" glow onClick={continueAfterAging}>
              Continue
            </SciFiButton>
          )}
        </div>
      </div>
    );
  };

  const renderComplete = () => {
    const chapter = character.chapters.find(
      (summary) => summary.termNumber === currentTerm.termNumber,
    );

    return (
      <div className="mt-8 space-y-6 animate-in slide-in-from-bottom-4">
        {chapter && <ChapterCard chapter={chapter} />}

        <div className="flex flex-col gap-4 justify-center sm:flex-row">
          <SciFiButton
            onClick={handleContinue}
            theme="violet"
            scifiVariant="outline"
            className="h-auto py-4 flex flex-col items-center min-w-[200px]"
          >
            <span className="font-bold text-lg">Continue Career</span>
            <span className="text-sm text-subtle">Term {character.terms.length + 1}</span>
          </SciFiButton>

          <SciFiButton
            onClick={handleMusterOut}
            theme="cyan"
            glow
            className="h-auto py-4 flex flex-col items-center min-w-[200px]"
          >
            <span className="font-bold text-lg">Muster Out</span>
            <span className="text-sm text-blue-200">End Service</span>
          </SciFiButton>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-heading font-display">{career.name}</h2>
          <div className="text-subtle">
            {career.name} — Term {character.terms.length}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-subtle">Current Rank</div>
          <div className="font-mono text-default">
            {getRankInfo(career, currentTerm.currentRank, currentTerm.commissioned === true)
              ?.title || `Rank ${currentTerm.currentRank}`}
          </div>
        </div>
      </div>

      {renderSurvival()}
      {phase !== 'survival' && !mishap && renderEvent()}
      {['skill', 'commission', 'advancement', 'aging', 'complete'].includes(phase) &&
        !mishap &&
        renderSkill()}
      {['commission', 'advancement', 'aging', 'complete'].includes(phase) &&
        !mishap &&
        shouldRenderCommission &&
        renderCommission()}
      {['advancement', 'aging', 'complete'].includes(phase) && !mishap && renderAdvancement()}
      {phase === 'aging' && renderAging()}
      {phase === 'complete' && !mishap && renderComplete()}
    </div>
  );
}
