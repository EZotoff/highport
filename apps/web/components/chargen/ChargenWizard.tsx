'use client';

import React, { useState, useEffect } from 'react';
import StepNavigation from './StepNavigation';
import CharacterPreview from './CharacterPreview';
import BackgroundStep from './steps/BackgroundStep';
import CareerSelectionStep from './steps/CareerSelectionStep';
import TermResolutionStep from './steps/TermResolutionStep';
import MusteringOutStep from './steps/MusteringOutStep';
import FinalizeStep from './steps/FinalizeStep';
import VerbositySelector from './VerbositySelector';
import ParticipantPanel from './ParticipantPanel';
import { EntityPoolPanel } from './EntityPoolPanel';
import { useCharacter } from '../../lib/chargen/hooks';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { getActiveCharacter } from '../../lib/identity';

const STEPS = [
  { id: 'background', label: 'Background' },
  { id: 'careers', label: 'Careers' },
  { id: 'skills', label: 'Skills' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'finalize', label: 'Finalize' },
];

export default function ChargenWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [verbosity, setVerbosity] = useState<VerbosityLevel>('structured');
  const character = useCharacter(characterId);

  useEffect(() => {
    if (characterId) return;
    const active = getActiveCharacter();
    if (active && active.characterId) {
        setCharacterId(active.characterId);
    }
  }, [characterId]);

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!character && (character.backgroundSkills?.length || 0) === 3;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <BackgroundStep 
            characterId={characterId} 
            onCharacterCreated={setCharacterId} 
          />
        );
      case 1:
        if (character?.status === 'term_resolution') {
          return (
            <TermResolutionStep
              characterId={characterId}
              verbosity={verbosity}
            />
          );
        }
        if (character?.status === 'mustering_out') {
          return <MusteringOutStep characterId={characterId} />;
        }
        if (character?.status === 'finalized') {
          return <FinalizeStep characterId={characterId} />;
        }
        return (
          <CareerSelectionStep 
            characterId={characterId} 
          />
        );
      default:
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-zinc-100 mb-2">{STEPS[currentStep].label}</h2>
            <p className="text-zinc-400">Step content coming soon...</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-6 mb-4">
        <StepNavigation 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={setCurrentStep}
        />
        <div className="min-w-[280px]">
          <VerbositySelector 
            value={verbosity} 
            onChange={setVerbosity}
          />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 overflow-hidden">
        {/* Left sidebar: Participants */}
        <div className="hidden lg:block lg:col-span-1 h-full overflow-hidden">
          <ParticipantPanel 
            currentUserId={characterId || undefined}
            onViewCharacter={setCharacterId}
          />
        </div>

        {/* Main content: Wizard steps */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 pb-4">
            {renderStepContent()}
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              &larr; Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentStep === STEPS.length - 1 || !isStepValid()}
              className={`px-6 py-2 rounded font-medium transition-colors ${
                currentStep === STEPS.length - 1 || !isStepValid()
                  ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              Continue &rarr;
            </button>
          </div>
        </div>

        {/* Right sidebar: Character Preview + Entity Pool */}
        <div className="hidden lg:flex lg:col-span-1 h-full flex-col gap-4 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <CharacterPreview characterId={characterId} />
          </div>
          <div className="h-64 shrink-0 overflow-hidden">
            <EntityPoolPanel 
              currentCharId={characterId || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
