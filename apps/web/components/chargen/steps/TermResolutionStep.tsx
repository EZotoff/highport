'use client';

import React, { useState } from 'react';
import { getYDoc } from '../../../lib/ydoc';
import { useCharacter } from '../../../lib/chargen/hooks';
import { updateCharacterFields } from '../../../lib/chargen/state';
import {
  getCareer,
  roll1d6,
  rollCareerEvent,
  rollMishap,
} from '@planeshift/mgt2e';
import {
  rollSurvival,
  rollAdvancement,
  applySkillGain,
  getRankInfo,
  parseCharacteristicBonus,
} from '../../../lib/chargen/term-resolution';
import { useEventNarrative, useNarrativeAvailable } from '../../../lib/chargen/useNarrative';
import type { VerbosityLevel } from '../../../lib/chargen/narrative';
import type { 
  CareerEvent, 
  CareerMishap, 
  DiceResult, 
  SkillTableEntry,
  CharacteristicSet,
  EventSpawn
} from '@planeshift/mgt2e';
import type { CareerTermResult, SpawnedEntityRef } from '../../../lib/chargen/types';
import EntitySpawnForm from '../EntitySpawnForm';
import ConnectionSuggestions from '../ConnectionSuggestions';
import { addEdge } from '../../../lib/yjs-helpers';
import type { GraphEdge } from '@planeshift/shared/types/graph';

interface TermResolutionStepProps {
  characterId: string | null;
  verbosity: VerbosityLevel;
}

type TermPhase = 'survival' | 'event' | 'event_choice' | 'skill' | 'advancement' | 'complete';

export default function TermResolutionStep({ characterId, verbosity }: TermResolutionStepProps) {
  const character = useCharacter(characterId);
  
  const [phase, setPhase] = useState<TermPhase>('survival');
  const [survivalRoll, setSurvivalRoll] = useState<DiceResult | undefined>();
  const [eventRoll, setEventRoll] = useState<DiceResult | undefined>();
  const [event, setEvent] = useState<CareerEvent | undefined>();
  const [eventChoice, setEventChoice] = useState<string | undefined>();
  const [eventAdvancementDM, setEventAdvancementDM] = useState<number>(0);
  const [mishap, setMishap] = useState<CareerMishap | undefined>();
  const [selectedTable, setSelectedTable] = useState<string | undefined>();
  const [skillRoll, setSkillRoll] = useState<DiceResult | undefined>();
  const [skillGained, setSkillGained] = useState<{ skill: string; specialty?: string } | undefined>();
  const [advancementRoll, setAdvancementRoll] = useState<DiceResult | undefined>();
  const [advanced, setAdvanced] = useState<boolean>(false);
  const [pendingSpawns, setPendingSpawns] = useState<EventSpawn[]>([]);
  const [currentSpawnIndex, setCurrentSpawnIndex] = useState(0);

  const [generatedDescription, setGeneratedDescription] = useState<string | undefined>();
  const { isAvailable: narrativeAvailable } = useNarrativeAvailable();
  const { generate: generateNarrative, isLoading: narrativeLoading, error: narrativeError } = useEventNarrative();

  if (!character) return <div className="text-zinc-400">Loading character...</div>;
  
  const currentTerm = character.terms[character.terms.length - 1];
  if (!currentTerm) return <div className="text-red-400">Error: No active term found.</div>;
  
  const career = getCareer(currentTerm.careerId);
  const assignment = career?.assignments.find(a => a.id === currentTerm.assignmentId);
  
  if (!career || !assignment) return <div className="text-red-400">Error: Invalid career or assignment.</div>;

  const handleSurvivalRoll = () => {
    const roll = rollSurvival(character, assignment);
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

  const handleEventChoice = (choice: string) => {
    setEventChoice(choice);
    
    if (choice.includes('DM+1')) setEventAdvancementDM(prev => prev + 1);
    if (choice.includes('DM+2')) setEventAdvancementDM(prev => prev + 2);

    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    updatedTerms[character.terms.length - 1] = {
      ...currentTerm,
      eventChoice: choice,
    };
    updateCharacterFields(doc, character.id, { terms: updatedTerms });
    
    setPhase('skill');
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
      setCurrentSpawnIndex(prev => prev + 1);
    } else {
      setPendingSpawns([]);
      setCurrentSpawnIndex(0);
    }
  };

  const handleSpawnSkip = () => {
    if (currentSpawnIndex < pendingSpawns.length - 1) {
      setCurrentSpawnIndex(prev => prev + 1);
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
    setSkillRoll(roll);
    
    let table: SkillTableEntry[] = [];
    switch (selectedTable) {
      case 'personal': table = career.skillTables.personal; break;
      case 'service': table = career.skillTables.service; break;
      case 'advanced': table = career.skillTables.advanced; break;
      case 'assignment': table = assignment.skillTable; break;
      case 'officer': table = career.skillTables.officer || []; break;
    }
    
    const entry = table.find(e => e.roll === roll.total);
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
    
    setTimeout(() => setPhase('advancement'), 1500);
  };

  const handleAdvancementRoll = () => {
    const roll = rollAdvancement(character, assignment, eventAdvancementDM);
    setAdvancementRoll(roll);
    
    const isPromoted = roll.total >= assignment.advancement.target;
    setAdvanced(isPromoted);

    const doc = getYDoc();
    let updatedTerms = [...character.terms];
    let term = updatedTerms[character.terms.length - 1];
    
    term.advancementRoll = roll;
    term.advanced = isPromoted;
    
    if (isPromoted) {
        const newRank = term.currentRank + 1;
        term.rankGained = 1;
        term.currentRank = newRank;
        
        const rankInfo = getRankInfo(career, newRank, false); 
        if (rankInfo && rankInfo.skill) {
             const newSkills = applySkillGain(character.skills, rankInfo.skill);
             updateCharacterFields(doc, character.id, { skills: newSkills });
             term.skillsGained.push({ skill: rankInfo.skill, level: 1 });
        }
    }
    
    updateCharacterFields(doc, character.id, { terms: updatedTerms });
    setPhase('complete');
  };

  const handleContinue = () => {
      const doc = getYDoc();
      
      const newTerm: CareerTermResult = {
          termNumber: character.terms.length + 1,
          careerId: career.id,
          assignmentId: assignment.id,
          startAge: character.age + 4,
          survived: false,
          advanced: false,
          currentRank: currentTerm.currentRank, 
          skillsGained: [],
          spawnedEntities: [],
      };
      
      updateCharacterFields(doc, character.id, {
          age: character.age + 4,
          terms: [...character.terms, newTerm],
          currentTermIndex: character.terms.length,
          status: 'term_resolution',
      });
      
      setPhase('survival');
      setSurvivalRoll(undefined);
      setEventRoll(undefined);
      setEvent(undefined);
      setEventChoice(undefined);
      setEventAdvancementDM(0);
      setSkillRoll(undefined);
      setSkillGained(undefined);
      setAdvancementRoll(undefined);
      setAdvanced(false);
  };

  const handleMusterOut = () => {
      const doc = getYDoc();
      updateCharacterFields(doc, character.id, {
          status: 'mustering_out',
          age: character.age + 4,
      });
  };

  const handleForcedMusterOut = () => {
      const doc = getYDoc();
      updateCharacterFields(doc, character.id, {
          status: 'career_selection',
      });
  };

  const handleGenerateDescription = async () => {
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
          priorEvents: character.terms.slice(0, -1).map(t => t.event?.description).filter(Boolean) as string[],
        },
        verbosity,
      });
      setGeneratedDescription(result.description);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcceptDescription = () => {
    if (!generatedDescription || !character) return;
    
    const doc = getYDoc();
    const updatedTerms = [...character.terms];
    const currentTermIndex = character.terms.length - 1;
    
    updatedTerms[currentTermIndex] = {
      ...updatedTerms[currentTermIndex],
      eventDescription: generatedDescription,
    };
    
    updateCharacterFields(doc, character.id, { terms: updatedTerms });
  };

  const handleAcceptConnection = (connection: { source: string; target: string; relationship: string; description: string }) => {
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
        <h3 className="text-xl font-bold text-zinc-100">Phase 1: Survival</h3>
        <span className="text-zinc-500 font-mono">
          {assignment.survival.characteristic} {assignment.survival.target}+
        </span>
      </div>
      
      {!survivalRoll ? (
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-6">
            Make a survival roll to avoid mishaps and continue your career.
          </p>
          <button
            onClick={handleSurvivalRoll}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-colors"
          >
            Roll Survival
          </button>
        </div>
      ) : (
        <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
            <div className="text-3xl font-mono font-bold mb-2">
                <span className={survivalRoll.total >= assignment.survival.target ? 'text-green-400' : 'text-red-400'}>
                    {survivalRoll.total}
                </span>
            </div>
            <div className="text-sm text-zinc-500 mb-2">
                Roll: {survivalRoll.dice[0]} + {survivalRoll.dice[1]} + DM {survivalRoll.modifier}
            </div>
            {survivalRoll.total >= assignment.survival.target ? (
                <div className="text-green-400 font-bold">✓ SURVIVED</div>
            ) : (
                <div className="space-y-4">
                    <div className="text-red-400 font-bold">✗ MISHAP</div>
                    {mishap && (
                        <div className="bg-red-900/20 p-4 rounded text-zinc-200">
                           {mishap.description}
                        </div>
                    )}
                    <button
                        onClick={handleForcedMusterOut}
                        className="bg-red-900 hover:bg-red-800 text-white px-6 py-2 rounded"
                    >
                        Accept Mishap & Leave Career
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );

  const renderEvent = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
       <h3 className="text-xl font-bold text-zinc-100 mb-4">Phase 2: Career Event</h3>
       
       {!eventRoll ? (
           <div className="text-center">
               <button
                 onClick={handleEventRoll}
                 className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-colors"
               >
                 Roll Event
               </button>
           </div>
       ) : (
           <div className="space-y-4">
               <div className="flex justify-between text-zinc-500 font-mono text-sm border-b border-zinc-800 pb-2">
                   <span>Roll: {eventRoll.total}</span>
               </div>
               <div className="text-zinc-100 text-lg">
                   {event?.description}
               </div>

               {event && narrativeAvailable && (
                 <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-sm text-zinc-400">AI Description</span>
                     <button
                       onClick={handleGenerateDescription}
                       disabled={narrativeLoading}
                       className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded transition-colors"
                     >
                       {narrativeLoading ? 'Generating...' : generatedDescription ? 'Regenerate' : 'Generate Description'}
                     </button>
                   </div>
                   
                   {narrativeError && (
                     <div className="text-red-400 text-sm mb-2">
                       {narrativeError.message}
                     </div>
                   )}
                   
                    {generatedDescription && (
                      <div className="space-y-2">
                        <textarea
                          value={generatedDescription}
                          onChange={(e) => setGeneratedDescription(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-200 italic resize-y min-h-[80px] focus:outline-none focus:border-purple-500"
                          placeholder="Generated description will appear here..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleAcceptDescription}
                            className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                          >
                            Accept & Save
                          </button>
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
                  />
                ) : phase === 'event_choice' && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                        <button
                          onClick={confirmEvent}
                          className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded w-full"
                        >
                          Continue
                        </button>
                    </div>
                )}

                {/* Show connection suggestions when we have multiple spawned entities */}
                {currentTerm.spawnedEntities && currentTerm.spawnedEntities.length >= 2 && (
                  <ConnectionSuggestions
                    entities={currentTerm.spawnedEntities}
                    characterName={character.name}
                    careerHistory={character.terms.map(t => t.careerId)}
                    onAccept={handleAcceptConnection}
                  />
                )}
           </div>
       )}
    </div>
  );

  const renderSkill = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Phase 3: Skill Training</h3>
        
        {!selectedTable && !skillGained ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { id: 'personal', name: 'Personal Development' },
                    { id: 'service', name: 'Service Skills' },
                    { id: 'advanced', name: 'Advanced Education', minEdu: 8 },
                    { id: 'assignment', name: 'Assignment Skills' },
                    { id: 'officer', name: 'Officer Skills', officerOnly: true },
                ].map(table => (
                    <button
                        key={table.id}
                        disabled={(table.id === 'advanced' && (character.characteristics.EDU || 0) < (table.minEdu || 0)) || (table.id === 'officer' && currentTerm.currentRank < 1)}
                        onClick={() => handleSkillTableSelect(table.id)}
                        className="p-3 bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        {table.name}
                    </button>
                ))}
            </div>
        ) : !skillGained ? (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                     <h4 className="text-zinc-300 font-bold capitalize">{selectedTable} Table</h4>
                     <button onClick={() => setSelectedTable(undefined)} className="text-xs text-zinc-500 hover:text-zinc-300">Change Table</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={handleSkillRoll}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-bold"
                        >
                            Roll 1d6
                        </button>
                        <div className="text-center text-xs text-zinc-500">OR Pick Specific Skill (House Rule)</div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="bg-green-900/20 border border-green-800 rounded p-4 text-center">
                 <div className="text-green-400 font-bold text-lg mb-1">Skill Gained</div>
                 <div className="text-white text-2xl capitalize">{skillGained.skill}</div>
            </div>
        )}
    </div>
  );

  const renderAdvancement = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 animate-in fade-in mt-4">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-zinc-100">Phase 4: Advancement</h3>
            <span className="text-zinc-500 font-mono">
                {assignment.advancement.characteristic} {assignment.advancement.target}+
            </span>
        </div>
        
        {!advancementRoll ? (
            <div className="text-center">
                 <p className="text-zinc-400 mb-4">Roll for promotion to the next rank.</p>
                 <button
                    onClick={handleAdvancementRoll}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold"
                 >
                    Roll Advancement
                 </button>
            </div>
        ) : (
            <div className="bg-zinc-950 rounded p-4 border border-zinc-800 text-center">
                 <div className="text-3xl font-mono font-bold mb-2">
                    <span className={advanced ? 'text-green-400' : 'text-zinc-400'}>
                        {advancementRoll.total}
                    </span>
                 </div>
                 <div className="text-sm text-zinc-500 mb-2">
                    Roll: {advancementRoll.dice[0]} + {advancementRoll.dice[1]} + DM {advancementRoll.modifier}
                 </div>
                 {advanced ? (
                     <div className="text-green-400 font-bold">✓ PROMOTED to Rank {currentTerm.currentRank}</div>
                 ) : (
                     <div className="text-zinc-500 font-bold">NO PROMOTION</div>
                 )}
            </div>
        )}
    </div>
  );
  
  const renderComplete = () => (
      <div className="mt-8 flex gap-4 justify-center animate-in slide-in-from-bottom-4">
          <button
              onClick={handleContinue}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-lg border border-zinc-700 flex flex-col items-center min-w-[200px]"
          >
              <span className="font-bold text-lg">Continue Career</span>
              <span className="text-sm text-zinc-400">Term {character.terms.length + 1}</span>
          </button>
          
          <button
              onClick={handleMusterOut}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg flex flex-col items-center min-w-[200px]"
          >
              <span className="font-bold text-lg">Muster Out</span>
              <span className="text-sm text-blue-200">End Service</span>
          </button>
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
          <div>
              <h2 className="text-2xl font-bold text-white">{career.name}</h2>
              <div className="text-zinc-400">{assignment.name} • Term {character.terms.length}</div>
          </div>
          <div className="text-right">
              <div className="text-sm text-zinc-500">Current Rank</div>
              <div className="font-mono text-zinc-200">{getRankInfo(career, currentTerm.currentRank)?.title || 'Rank ' + currentTerm.currentRank}</div>
          </div>
      </div>

      {renderSurvival()}
      {phase !== 'survival' && !mishap && renderEvent()}
      {['skill', 'advancement', 'complete'].includes(phase) && !mishap && renderSkill()}
      {['advancement', 'complete'].includes(phase) && !mishap && renderAdvancement()}
      {phase === 'complete' && !mishap && renderComplete()}
    </div>
  );
}
