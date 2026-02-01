'use client';

import React, { useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import { 
  getAllCareers, 
  getCareer, 
  roll2d6, 
  getCharacteristicModifier 
} from '@planeshift/mgt2e';
import type { CareerDefinition } from '@planeshift/mgt2e';
import type { CareerTermResult } from '../../../lib/chargen/types';

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

  const character = useCharacter(characterId);
  const careers = getAllCareers();

  // Calculate qualification DM for a career
  const getQualificationDM = (career: CareerDefinition): number => {
    if (!character) return 0;
    const stat = career.qualification.characteristic;
    const statValue = character.characteristics[stat] || 0;
    const charDM = getCharacteristicModifier(statValue);
    const prevCareerPenalty = (character.terms?.length || 0) * (career.qualification.previousCareerPenalty || -1); // Default -1 if not specified
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
    
    const assignment = career.assignments.find(a => a.id === assignmentId);
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
      currentTermIndex: (character.terms?.length || 0),
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
      currentTermIndex: (character.terms?.length || 0),
      status: 'term_resolution',
    });
  };

  const resetSelection = () => {
    setSelectedCareer(null);
    setQualificationResult(null);
  };

  if (!character) return <div className="text-zinc-400">Loading character...</div>;

  // View: Qualification Result (Success/Fail)
  if (selectedCareer && qualificationResult) {
    const career = getCareer(selectedCareer);
    if (!career) return null;

    if (qualificationResult.success) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-green-400 mb-2">
              ✓ Qualified for {career.name}
            </h3>
            <div className="flex justify-center gap-6 text-zinc-300 font-mono text-lg">
              <span>Roll: <span className="text-white">{qualificationResult.roll}</span></span>
              <span>DM: <span className="text-white">{qualificationResult.dm >= 0 ? '+' : ''}{qualificationResult.dm}</span></span>
              <span>Total: <span className="text-green-400 font-bold">{qualificationResult.roll + qualificationResult.dm}</span></span>
              <span>Target: <span className="text-zinc-400">{qualificationResult.target}+</span></span>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-bold text-zinc-100 mb-4">Choose Assignment</h4>
            <div className="grid grid-cols-1 gap-4">
              {career.assignments.map(assignment => (
                <button
                  key={assignment.id}
                  onClick={() => selectAssignment(assignment.id)}
                  className="bg-zinc-900 border border-zinc-800 hover:border-blue-500 hover:bg-zinc-800 transition-all rounded-lg p-4 text-left group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="text-lg font-bold text-blue-200 group-hover:text-blue-100">
                      {assignment.name}
                    </h5>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
                      Click to Select
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm mb-3">{assignment.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs text-zinc-500 font-mono">
                    <div>Survival: {assignment.survival.characteristic} {assignment.survival.target}+</div>
                    <div>Advancement: {assignment.advancement.characteristic} {assignment.advancement.target}+</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetSelection}
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            &larr; Choose Different Career
          </button>
        </div>
      );
    } else {
      // Failed Qualification
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 text-center">
            <h3 className="text-2xl font-bold text-red-400 mb-2">
              ✗ Qualification Failed
            </h3>
            <div className="flex justify-center gap-6 text-zinc-300 font-mono text-lg">
              <span>Roll: <span className="text-white">{qualificationResult.roll}</span></span>
              <span>DM: <span className="text-white">{qualificationResult.dm >= 0 ? '+' : ''}{qualificationResult.dm}</span></span>
              <span>Total: <span className="text-red-400 font-bold">{qualificationResult.roll + qualificationResult.dm}</span></span>
              <span>Target: <span className="text-zinc-400">{qualificationResult.target}+</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={resetSelection}
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg border border-zinc-700 transition-colors"
            >
              <div className="font-bold mb-1">Try Another Career</div>
              <div className="text-xs text-zinc-400">Choose a different path</div>
            </button>
            
            <button
              onClick={becomeDrifter}
              className="bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-lg border border-zinc-700 transition-colors"
            >
              <div className="font-bold mb-1">Become Drifter</div>
              <div className="text-xs text-zinc-400">No qualification needed</div>
            </button>
            
            <button
              disabled
              className="bg-zinc-900 text-zinc-600 p-4 rounded-lg border border-zinc-800 cursor-not-allowed opacity-50"
            >
              <div className="font-bold mb-1">Submit to Draft</div>
              <div className="text-xs">Coming soon</div>
            </button>
          </div>
        </div>
      );
    }
  }

  // View: Career List
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Career Selection</h2>
          <p className="text-zinc-400">Term {(character.terms?.length || 0) + 1} (Age {character.age})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {careers.filter(c => c.id !== 'drifter').map(career => {
          const dm = getQualificationDM(career);
          const dmStr = dm >= 0 ? `+${dm}` : `${dm}`;
          
          return (
            <div 
              key={career.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col group hover:border-zinc-700 transition-colors"
            >
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-zinc-200">{career.name}</h3>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded">
                    {career.qualification.characteristic} {career.qualification.target}+
                  </span>
                </div>
                <p className="text-sm text-zinc-400 line-clamp-3">{career.description}</p>
              </div>
              
              <div className="mt-auto pt-4 border-t border-zinc-800">
                <div className="flex justify-between items-center mb-3 text-sm">
                  <span className="text-zinc-500">Your DM:</span>
                  <span className={`font-mono font-bold ${dm >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {dmStr}
                  </span>
                </div>
                
                <button
                  onClick={() => attemptQualification(career.id)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded font-medium transition-colors text-sm border border-zinc-700 group-hover:border-zinc-600"
                >
                  Try to Join
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-zinc-800 pt-6">
        <h3 className="text-lg font-bold text-zinc-200 mb-4">Other Options</h3>
        <button
          onClick={becomeDrifter}
          className="w-full md:w-auto bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 px-6 py-3 rounded-lg transition-colors flex items-center justify-between gap-4 group"
        >
          <div className="text-left">
            <div className="font-bold group-hover:text-white">Become a Drifter</div>
            <div className="text-xs text-zinc-500">Wanderers, scavengers, and barbarians. No qualification required.</div>
          </div>
          <span className="text-zinc-600 group-hover:text-zinc-400">&rarr;</span>
        </button>
      </div>
    </div>
  );
}
