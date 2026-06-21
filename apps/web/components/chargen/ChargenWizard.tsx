'use client';

import React, { useState, useEffect } from 'react';
import StepNavigation from './StepNavigation';
import CharacterPreview from './CharacterPreview';
import BackgroundStep from './steps/BackgroundStep';
import CareerSelectionStep from './steps/CareerSelectionStep';
import TermResolutionStep from './steps/TermResolutionStep';
import MusteringOutStep from './steps/MusteringOutStep';
import FinalizeStep from './steps/FinalizeStep';
import SkillsStep from './steps/SkillsStep';
import BenefitsStep from './steps/BenefitsStep';
import VerbositySelector from './VerbositySelector';
import ParticipantPanel from './ParticipantPanel';
import { EntityPoolPanel } from './EntityPoolPanel';
import { useCharacter } from '../../lib/chargen/hooks';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { getActiveCharacter } from '../../lib/identity';
import { getSessionId, initAndWaitForPersistence, initProvider } from '../../lib/sync';
import { getYDoc } from '../../lib/ydoc';
import { GlassPanel, SciFiButton } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { GMControlPanel } from './GMControlPanel';

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
    const sessionId = getSessionId('graph');
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsSynced(true);
      }
    }, 2000);
    initAndWaitForPersistence(doc, `highport-graph-${sessionId}`).then(() => {
      if (isMounted) {
        initProvider(doc, sessionId);
        clearTimeout(fallbackTimer);
        setIsSynced(true);
      }
    });
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
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
        localStorage.removeItem('highport_active_character');
        setCharacterId(null);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isSynced, characterId, character]);

  useEffect(() => {
    if (!character) return;

    const statusToStep: Record<string, number> = {
      background: 0,
      career_selection: 1,
      term_resolution: 1,
      mustering_out: 1,
      finalized: 4,
    };

    const targetStep = statusToStep[character.status] ?? 0;
    if (currentStep !== targetStep) {
      setCurrentStep(targetStep);
    }
  }, [character?.status]);

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return (
          !!character && (character.backgroundSkills?.length || 0) === 3 && !!character.name?.trim()
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1 && isStepValid()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const renderStepContent = () => {
    if (character?.status === 'finalized') {
      return <FinalizeStep characterId={characterId} />;
    }

    switch (currentStep) {
      case 0:
        return <BackgroundStep characterId={characterId} onCharacterCreated={setCharacterId} />;
      case 1:
        if (character?.status === 'term_resolution') {
          return <TermResolutionStep characterId={characterId} verbosity={verbosity} />;
        }
        if (character?.status === 'mustering_out') {
          return <MusteringOutStep characterId={characterId} />;
        }
        return <CareerSelectionStep characterId={characterId} />;
      case 2:
        return <SkillsStep characterId={characterId} />;
      case 3:
        return <BenefitsStep characterId={characterId} />;
      case 4:
        return <FinalizeStep characterId={characterId} />;
      default:
        return (
          <GlassPanel theme="violet" variant="default" className="p-6 text-center">
            <h2 className="text-xl font-bold text-heading mb-2 font-display">
              {STEPS[currentStep].label}
            </h2>
            <p className="text-subtle">Step content coming soon...</p>
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
            data-testid="participant-panel"
          >
            Loading session...
          </div>
          <p className="text-sm text-subtle">Syncing character data</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-4 lg:gap-6 mb-6">
        <div className="w-full lg:flex-1 lg:min-w-0">
          <StepNavigation steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
        </div>
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <VerbositySelector value={verbosity} onChange={setVerbosity} />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0 overflow-hidden">
        {/* Left sidebar: Participants */}
        <div className="lg:col-span-1 h-full overflow-hidden min-w-0">
          <ParticipantPanel
            currentUserId={characterId || undefined}
            onViewCharacter={setCharacterId}
          />
        </div>

        {/* Main content: Wizard steps */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden min-w-0 px-2 lg:px-4">
          <div className="flex-1 overflow-y-auto pr-2 pb-4">{renderStepContent()}</div>

          <div
            className="mt-4 pt-4 flex justify-between"
            style={{ borderTop: `1px solid rgba(148, 163, 184, 0.2)` }}
          >
            <SciFiButton
              onClick={handleBack}
              disabled={currentStep === 0}
              scifiVariant="ghost"
              theme="slate"
            >
              ← Back
            </SciFiButton>

            <SciFiButton
              onClick={handleNext}
              disabled={currentStep === STEPS.length - 1 || !isStepValid()}
              theme="cyan"
              glow
            >
              Continue →
            </SciFiButton>
          </div>
        </div>

        {/* Right sidebar: Character Preview + Entity Pool */}
        <div className="lg:col-span-1 h-full flex flex-col gap-4 overflow-hidden min-w-0">
          <div className="flex-1 min-h-0 overflow-hidden">
            <CharacterPreview characterId={characterId} />
          </div>
          <div className="h-64 shrink-0 overflow-hidden">
            <EntityPoolPanel currentCharId={characterId || undefined} />
          </div>
        </div>
      </div>

      <GMControlPanel currentUserId={characterId || ''} />
    </div>
  );
}
