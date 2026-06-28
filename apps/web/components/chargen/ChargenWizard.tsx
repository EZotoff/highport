'use client';

import { useEffect, useState } from 'react';
import { GlassPanel, SciFiButton } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { useCharacter } from '../../lib/chargen/hooks';
import type { VerbosityLevel } from '../../lib/chargen/narrative';
import { createSession, getSession, updateCharacterFields } from '../../lib/chargen/state';
import { getActiveCharacter, getOrCreateUser } from '../../lib/identity';
import { getSessionId, initAndWaitForPersistence, initProvider } from '../../lib/sync';
import { getYDoc } from '../../lib/ydoc';
import CharacterPreview from './CharacterPreview';
import { EntityPoolPanel } from './EntityPoolPanel';
import { GMControlPanel } from './GMControlPanel';
import { useGMControls } from '../../lib/chargen/useGMControls';
import ParticipantPanel from './ParticipantPanel';
import StepNavigation from './StepNavigation';
import BackgroundStep from './steps/BackgroundStep';
import CareerSelectionStep from './steps/CareerSelectionStep';
import FinalizeStep from './steps/FinalizeStep';
import MusteringOutStep from './steps/MusteringOutStep';
import TermResolutionStep from './steps/TermResolutionStep';
import VerbositySelector from './VerbositySelector';

const STEPS = [
  { id: 'background', label: 'Background' },
  { id: 'careers', label: 'Careers' },
  { id: 'skills', label: 'Skills' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'finalize', label: 'Finalize' },
];

export default function ChargenWizard() {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [verbosity, setVerbosity] = useState<VerbosityLevel>('inspiration');
  const [isSynced, setIsSynced] = useState(false);
  const character = useCharacter(characterId);
  const [currentSessionUserId] = useState(() => getOrCreateUser().userId);
  const { isGM } = useGMControls(currentSessionUserId);

  const statusToStep: Record<string, number> = {
    background: 0,
    career_selection: 1,
    term_resolution: 2,
    mustering_out: 3,
    finalized: 4,
  };
  const currentStep = statusToStep[character?.status ?? 'background'] ?? 0;

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

        setTimeout(() => {
          if (!isMounted) return;
          if (!getSession(doc)) {
            const user = getOrCreateUser();
            createSession(doc, sessionId, user.userId);
          }
        }, 500);
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
    if (active?.characterId) {
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
    if (!character || !characterId || !isStepValid()) return;
    if (character.status === 'background') {
      updateCharacterFields(getYDoc(), characterId, {
        status: 'career_selection',
      });
    }
  };

  const handleBack = () => {
    if (!character || !characterId) return;
    if (character.status === 'career_selection') {
      updateCharacterFields(getYDoc(), characterId, { status: 'background' });
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
        return <CareerSelectionStep characterId={characterId} />;
      case 2:
        return <TermResolutionStep characterId={characterId} verbosity={verbosity} />;
      case 3:
        return <MusteringOutStep characterId={characterId} />;
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
      <div
        className="flex flex-col h-full max-w-7xl mx-auto items-center justify-center"
        data-chargen-status="loading"
        data-testid="chargen-wizard"
      >
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
    <div
      className="flex flex-col h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4"
      data-chargen-status={character?.status ?? 'background'}
      data-testid="chargen-wizard"
    >
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-4 lg:gap-6 mb-6">
        <div className="w-full lg:flex-1 lg:min-w-0">
          <StepNavigation steps={STEPS} currentStep={currentStep} />
        </div>
        <div className="w-full lg:w-[320px] lg:shrink-0">
          <VerbositySelector value={verbosity} onChange={setVerbosity} />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:grid-rows-1 gap-8 min-h-0 overflow-hidden">
        {/* Left sidebar: Participants */}
        <div className="h-full overflow-hidden min-w-0">
          <ParticipantPanel
            currentUserId={characterId || undefined}
            onViewCharacter={setCharacterId}
          />
        </div>

        {/* Main content: Wizard steps */}
        <div className="flex flex-col h-full overflow-hidden min-w-0 px-2 lg:px-4">
          <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
            {renderStepContent()}
          </div>

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
        <div
          className={`h-full flex flex-col gap-4 overflow-hidden min-w-0 ${isGM ? 'lg:pb-16' : ''}`}
        >
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <CharacterPreview characterId={characterId} />
          </div>
          <div className="h-36 shrink-0 overflow-hidden">
            <EntityPoolPanel currentCharId={characterId || undefined} />
          </div>
        </div>
      </div>

      <GMControlPanel currentUserId={currentSessionUserId} />
    </div>
  );
}
