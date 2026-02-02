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
import { initAndWaitForPersistence } from '../../lib/sync';
import { getYDoc } from '../../lib/ydoc';
import { GlassPanel } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

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
  const [isSynced, setIsSynced] = useState(false);
  const character = useCharacter(characterId);

  useEffect(() => {
    const doc = getYDoc();
    initAndWaitForPersistence(doc).then(() => {
      setIsSynced(true);
    });
  }, []);

  useEffect(() => {
    if (!isSynced || characterId) return;
    const active = getActiveCharacter();
    if (active && active.characterId) {
        setCharacterId(active.characterId);
    }
  }, [isSynced, characterId]);

  useEffect(() => {
    if (!isSynced || !characterId) return;
    if (character) return;
    
    const timer = setTimeout(() => {
      if (!character) {
        localStorage.removeItem('planeshift_active_character');
        setCharacterId(null);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isSynced, characterId, character]);

  useEffect(() => {
    if (!character) return;
    
    const statusToStep: Record<string, number> = {
      'background': 0,
      'career_selection': 1,
      'term_resolution': 1,
      'mustering_out': 1,
      'finalized': 4,
    };
    
    const targetStep = statusToStep[character.status] ?? 0;
    if (currentStep !== targetStep) {
      setCurrentStep(targetStep);
    }
  }, [character?.status]);

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return !!character && 
               (character.backgroundSkills?.length || 0) === 3 &&
               !!character.name?.trim();
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
    if (character?.status === 'finalized') {
      return <FinalizeStep characterId={characterId} />;
    }

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
        return (
          <CareerSelectionStep 
            characterId={characterId} 
          />
        );
      case 2:
        return (
          <GlassPanel theme="violet" variant="default" className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-100 mb-2">Skills</h2>
            <p style={{ color: THEME_HEX.slate }}>Step content coming soon...</p>
          </GlassPanel>
        );
      case 3:
        return (
          <GlassPanel theme="violet" variant="default" className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-100 mb-2">Benefits</h2>
            <p style={{ color: THEME_HEX.slate }}>Step content coming soon...</p>
          </GlassPanel>
        );
      case 4:
        return <FinalizeStep characterId={characterId} />;
      default:
        return (
          <GlassPanel theme="violet" variant="default" className="p-6 text-center">
            <h2 className="text-xl font-bold text-gray-100 mb-2">{STEPS[currentStep].label}</h2>
            <p style={{ color: THEME_HEX.slate }}>Step content coming soon...</p>
          </GlassPanel>
        );
    }
  };

  if (!isSynced) {
    return (
      <div className="flex flex-col h-full max-w-7xl mx-auto items-center justify-center">
        <GlassPanel theme="cyan" variant="default" className="p-8 text-center">
          <div 
            className="animate-pulse mb-2 text-lg font-medium"
            style={{ color: THEME_HEX.cyan }}
          >
            Loading...
          </div>
          <p className="text-sm" style={{ color: THEME_HEX.slate }}>Syncing character data</p>
        </GlassPanel>
      </div>
    );
  }

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
          
          <div 
            className="mt-4 pt-4 flex justify-between"
            style={{ borderTop: `1px solid rgba(148, 163, 184, 0.2)` }}
          >
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded font-medium transition-all duration-200"
              style={currentStep === 0 
                ? { 
                    backgroundColor: 'rgba(26, 31, 46, 0.6)',
                    color: THEME_HEX.slate,
                    cursor: 'not-allowed',
                  }
                : { 
                    backgroundColor: 'rgba(148, 163, 184, 0.15)',
                    color: '#e2e8f0',
                    border: `1px solid rgba(148, 163, 184, 0.3)`,
                  }
              }
              onMouseEnter={(e) => {
                if (currentStep !== 0) {
                  e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.25)';
                  e.currentTarget.style.boxShadow = `0 0 12px rgba(148, 163, 184, 0.2)`;
                }
              }}
              onMouseLeave={(e) => {
                if (currentStep !== 0) {
                  e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              ← Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentStep === STEPS.length - 1 || !isStepValid()}
              className="px-6 py-2 rounded font-medium transition-all duration-200"
              style={currentStep === STEPS.length - 1 || !isStepValid()
                ? { 
                    backgroundColor: 'rgba(26, 31, 46, 0.6)',
                    color: THEME_HEX.slate,
                    cursor: 'not-allowed',
                  }
                : { 
                    backgroundColor: THEME_HEX.cyan,
                    color: '#0a0d14',
                    boxShadow: `0 0 16px ${THEME_HEX.cyan}40`,
                  }
              }
              onMouseEnter={(e) => {
                if (!(currentStep === STEPS.length - 1 || !isStepValid())) {
                  e.currentTarget.style.boxShadow = `0 0 24px ${THEME_HEX.cyan}60`;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!(currentStep === STEPS.length - 1 || !isStepValid())) {
                  e.currentTarget.style.boxShadow = `0 0 16px ${THEME_HEX.cyan}40`;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              Continue →
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
