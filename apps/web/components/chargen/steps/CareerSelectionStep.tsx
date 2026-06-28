'use client';

import React, { useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import { SciFiButton, SciFiCard, SciFiDialog } from '@/components/ui/scifi';
import {
  getAllCareers,
  getCareer,
  roll2d6,
  getCharacteristicModifier,
  rollDraftCareer,
} from '@highport/mgt2e';
import type { CareerDefinition } from '@highport/mgt2e';
import type { CareerTermResult } from '../../../lib/chargen/types';

const CONSCRIPTION_SURVIVAL_DM = 2;

interface CareerSelectionStepProps {
  characterId: string | null;
}

export default function CareerSelectionStep({ characterId }: CareerSelectionStepProps) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [qualificationResult, setQualificationResult] = useState<{
    roll: number;
    dm: number;
    target: number;
    success: boolean;
  } | null>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [draftResult, setDraftResult] = useState<ReturnType<typeof rollDraftCareer> | null>(null);
  const [draftRolling, setDraftRolling] = useState(false);

  const character = useCharacter(characterId);
  const careers = getAllCareers();

  // Calculate qualification DM for a career
  const getQualificationDM = (career: CareerDefinition): number => {
    if (!character) return 0;
    const stat = career.qualification.characteristic;
    const statValue = character.characteristics[stat] || 0;
    const charDM = getCharacteristicModifier(statValue);
    const otherCareerTermCount =
      character.terms?.filter((t) => t.careerId !== career.id).length || 0;
    const prevCareerPenalty =
      otherCareerTermCount * (career.qualification.previousCareerPenalty || -1); // Default -1 if not specified
    return charDM + prevCareerPenalty;
  };

  // Attempt qualification for selected career
  const attemptQualification = (careerId: string) => {
    if (!character) return;

    const career = getCareer(careerId);
    if (!career) return;

    setSelectedCareer(careerId);

    const dm = getQualificationDM(career);
    const rollResult = roll2d6();
    const total = rollResult.total + dm;
    const success = total >= career.qualification.target;

    setQualificationResult({
      roll: rollResult.total,
      dm,
      target: career.qualification.target,
      success,
    });
  };

  // Select assignment and start term
  const selectAssignment = (assignmentId: string) => {
    if (!character || !selectedCareer) return;

    const career = getCareer(selectedCareer);
    if (!career) return;

    const assignment = career.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    // Create new term
    const newTerm: CareerTermResult = {
      termNumber: (character.terms?.length || 0) + 1,
      careerId: selectedCareer,
      assignmentId,
      startAge: character.age,
      survived: false,
      advanced: false,
      currentRank: 0,
      skillsGained: [],
      spawnedEntities: [],
    };

    const doc = getYDoc();
    updateCharacterFields(doc, character.id, {
      terms: [...(character.terms || []), newTerm],
      currentTermIndex: character.terms?.length || 0,
      status: 'term_resolution',
    });
  };

  // Handle becoming a Drifter (no qualification)
  const becomeDrifter = () => {
    if (!character) return;

    const newTerm: CareerTermResult = {
      termNumber: (character.terms?.length || 0) + 1,
      careerId: 'drifter',
      assignmentId: 'barbarian', // Default per instructions
      startAge: character.age,
      survived: false,
      advanced: false,
      currentRank: 0,
      skillsGained: [],
      spawnedEntities: [],
    };

    const doc = getYDoc();
    updateCharacterFields(doc, character.id, {
      terms: [...(character.terms || []), newTerm],
      currentTermIndex: character.terms?.length || 0,
      status: 'term_resolution',
    });
  };

  const submitToDraft = () => {
    setDraftDialogOpen(true);
    setDraftResult(null);
    setDraftRolling(false);
  };

  const rollDraft = () => {
    setDraftRolling(true);
    const result = rollDraftCareer();
    setDraftResult(result);
    setDraftRolling(false);
  };

  const beginDraftedTerm = () => {
    if (!character || !draftResult) return;

    const career = getCareer(draftResult.careerId);
    const assignment = career?.assignments[0];
    if (!career || !assignment) return;

    const newTerm: CareerTermResult = {
      termNumber: (character.terms?.length || 0) + 1,
      careerId: career.id,
      assignmentId: assignment.id,
      startAge: character.age,
      drafted: true,
      draftRoll: draftResult.roll,
      survivalDmBonus: CONSCRIPTION_SURVIVAL_DM,
      survived: false,
      advanced: false,
      currentRank: 0,
      skillsGained: [],
      spawnedEntities: [],
    };

    const doc = getYDoc();
    updateCharacterFields(doc, character.id, {
      terms: [...(character.terms || []), newTerm],
      currentTermIndex: character.terms?.length || 0,
      status: 'term_resolution',
    });
  };

  const resetSelection = () => {
    setSelectedCareer(null);
    setQualificationResult(null);
  };

  if (!character) return <div className="text-subtle">Loading character...</div>;

  // View: Qualification Result (Success/Fail)
  if (selectedCareer && qualificationResult) {
    const career = getCareer(selectedCareer);
    if (!career) return null;

    if (qualificationResult.success) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <SciFiCard
            theme="emerald"
            variant="elevated"
            title={`✓ Qualified for ${career.name}`}
            glow={true}
          >
            <div className="flex justify-center gap-6 text-label font-mono text-lg mb-8 bg-black/20 p-4 rounded-lg">
              <span>
                Roll: <span className="text-heading">{qualificationResult.roll}</span>
              </span>
              <span>
                DM:{' '}
                <span className="text-heading">
                  {qualificationResult.dm >= 0 ? '+' : ''}
                  {qualificationResult.dm}
                </span>
              </span>
              <span>
                Total:{' '}
                <span className="text-emerald-400 font-bold">
                  {qualificationResult.roll + qualificationResult.dm}
                </span>
              </span>
              <span>
                Target: <span className="text-subtle">{qualificationResult.target}+</span>
              </span>
            </div>

            <div>
              <h4 className="text-xl font-bold text-heading mb-4 font-orbitron">
                Choose Assignment
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {career.assignments.map((assignment) => (
                  <SciFiButton
                    key={assignment.id}
                    theme="cyan"
                    scifiVariant="secondary"
                    className="h-auto flex flex-col items-start p-4 w-full"
                    onClick={() => selectAssignment(assignment.id)}
                  >
                    <div className="flex justify-between w-full mb-1">
                      <h5 className="text-lg font-bold text-cyan-200">{assignment.name}</h5>
                    </div>
                    <p className="text-subtle text-sm mb-3 text-left whitespace-normal font-sans normal-case">
                      {assignment.description}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs text-subtle font-mono w-full">
                      <div className="text-left">
                        Survival: {assignment.survival.characteristic} {assignment.survival.target}+
                      </div>
                      <div className="text-left">
                        Advancement: {assignment.advancement.characteristic}{' '}
                        {assignment.advancement.target}+
                      </div>
                    </div>
                  </SciFiButton>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <SciFiButton
                theme="slate"
                scifiVariant="ghost"
                onClick={resetSelection}
                className="text-sm"
              >
                &larr; Choose Different Career
              </SciFiButton>
            </div>
          </SciFiCard>
        </div>
      );
    } else {
      // Failed Qualification
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <SciFiCard theme="red" variant="elevated" title="✗ Qualification Failed" glow={true}>
            <div className="flex justify-center gap-6 text-label font-mono text-lg mb-8 bg-black/20 p-4 rounded-lg">
              <span>
                Roll: <span className="text-heading">{qualificationResult.roll}</span>
              </span>
              <span>
                DM:{' '}
                <span className="text-heading">
                  {qualificationResult.dm >= 0 ? '+' : ''}
                  {qualificationResult.dm}
                </span>
              </span>
              <span>
                Total:{' '}
                <span className="text-red-400 font-bold">
                  {qualificationResult.roll + qualificationResult.dm}
                </span>
              </span>
              <span>
                Target: <span className="text-subtle">{qualificationResult.target}+</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SciFiButton
                theme="amber"
                scifiVariant="outline"
                onClick={resetSelection}
                className="h-auto flex flex-col p-4"
              >
                <div className="font-bold mb-1">Try Another Career</div>
                <div className="text-xs text-amber-400/70 font-sans normal-case">
                  Choose a different path
                </div>
              </SciFiButton>

              <SciFiButton
                theme="slate"
                scifiVariant="secondary"
                onClick={becomeDrifter}
                className="h-auto flex flex-col p-4"
              >
                <div className="font-bold mb-1">Become Drifter</div>
                <div className="text-xs text-subtle font-sans normal-case">
                  No qualification needed
                </div>
              </SciFiButton>

              <SciFiButton
                theme="cyan"
                scifiVariant="outline"
                onClick={submitToDraft}
                className="h-auto flex flex-col p-4"
              >
                <div className="font-bold mb-1">Submit to Draft</div>
                <div className="text-xs font-sans normal-case">Roll 1d6 for assigned service</div>
              </SciFiButton>
            </div>
          </SciFiCard>

          <SciFiDialog
            open={draftDialogOpen}
            onOpenChange={setDraftDialogOpen}
            title="Submit to Draft"
            description="The draft assigns a service by 1d6. Your first term still requires a survival roll, with a +2 conscription DM."
            theme="cyan"
            footer={
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
                <SciFiButton
                  theme="slate"
                  scifiVariant="ghost"
                  onClick={() => setDraftDialogOpen(false)}
                >
                  Cancel
                </SciFiButton>
                {!draftResult ? (
                  <SciFiButton theme="cyan" glow onClick={rollDraft} disabled={draftRolling}>
                    Confirm Draft Submission
                  </SciFiButton>
                ) : (
                  <SciFiButton theme="cyan" glow onClick={beginDraftedTerm}>
                    Begin Drafted Term
                  </SciFiButton>
                )}
              </div>
            }
          >
            <div className="space-y-4">
              {!draftResult ? (
                <div className="rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4 text-sm text-subtle">
                  {draftRolling
                    ? 'Rolling draft channel...'
                    : 'Confirm to roll 1d6 and accept the assigned draft career.'}
                </div>
              ) : (
                <div className="rounded-lg border border-cyan-700/50 bg-cyan-950/30 p-4">
                  <div className="text-sm text-subtle font-mono mb-2">
                    Draft roll: {draftResult.roll.rolls[0]}
                  </div>
                  <div className="text-xl font-bold text-cyan-200 font-orbitron">
                    Assigned to {getCareer(draftResult.careerId)?.name ?? draftResult.careerId}
                  </div>
                  <div className="text-sm text-subtle mt-2">
                    First term survival DM +{CONSCRIPTION_SURVIVAL_DM}; survival is not skipped.
                  </div>
                </div>
              )}
            </div>
          </SciFiDialog>
        </div>
      );
    }
  }

  // View: Career List
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-heading font-display">Career Selection</h2>
          <p className="text-subtle">
            Term {(character.terms?.length || 0) + 1} (Age {character.age})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {careers
          .filter((c) => c.id !== 'drifter')
          .map((career) => {
            const dm = getQualificationDM(career);
            const dmStr = dm >= 0 ? `+${dm}` : `${dm}`;

            return (
              <SciFiCard
                key={career.id}
                theme="cyan"
                variant="bordered"
                title={career.name}
                subtitle={
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50">
                    {career.qualification.characteristic} {career.qualification.target}+
                  </span>
                }
                className="h-full"
                footer={
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-3 text-sm">
                      <span className="text-label">Your DM:</span>
                      <span
                        className={`font-mono font-bold ${dm >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {dmStr}
                      </span>
                    </div>

                    <SciFiButton
                      theme="cyan"
                      scifiVariant="outline"
                      onClick={() => attemptQualification(career.id)}
                      className="w-full"
                    >
                      Try to Join
                    </SciFiButton>
                  </div>
                }
              >
                <p className="text-sm text-subtle line-clamp-3 leading-relaxed">
                  {career.description}
                </p>
              </SciFiCard>
            );
          })}
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-bold text-heading mb-4 font-orbitron">Other Options</h3>
        <SciFiButton
          onClick={becomeDrifter}
          theme="violet"
          scifiVariant="outline"
          className="w-full md:w-auto h-auto p-4 flex items-center justify-between gap-8 group"
        >
          <div className="text-left">
            <div className="font-bold text-heading transition-colors">Become a Drifter</div>
            <div className="text-xs text-subtle font-sans normal-case mt-1">
              Wanderers, scavengers, and barbarians. No qualification required.
            </div>
          </div>
          <span className="text-subtle transition-colors">&rarr;</span>
        </SciFiButton>
      </div>
    </div>
  );
}
