'use client';

import React from 'react';
import { Crown, Hourglass, Dice5 } from 'lucide-react';
import type { ChargenCharacter } from '../../lib/chargen/types';
import type { ChargenAwarenessState } from '../../lib/chargen/useParticipants';

interface ParticipantCardProps {
  character: ChargenCharacter | null;
  awareness?: ChargenAwarenessState | null;
  isGM?: boolean;
  isCurrentUser?: boolean;
  onViewProgress?: () => void;
}

function calculateProgress(character: ChargenCharacter): number {
  switch (character.status) {
    case 'background': return character.backgroundSkills.length > 0 ? 15 : 5;
    case 'career_selection': return 25;
    case 'term_resolution': return 30 + (character.currentTermIndex * 10);
    case 'mustering_out': return 90;
    case 'finalized': return 100;
    default: return 0;
  }
}

export default function ParticipantCard({
  character,
  awareness,
  isGM = false,
  isCurrentUser = false,
  onViewProgress,
}: ParticipantCardProps) {
  // GM card without character
  if (isGM && !character) {
    return (
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <div>
            <span className="text-default font-medium text-sm">Game Master</span>
            <p className="text-subtle text-xs">Watching</p>
          </div>
        </div>
      </div>
    );
  }

  // Not started state
  if (!character) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-subtle" />
          <span className="text-subtle text-sm">Not started</span>
        </div>
        <p className="text-subtle text-xs ml-5 mt-1">Waiting to begin...</p>
      </div>
    );
  }

  const progress = calculateProgress(character);
  const currentTerm = character.terms.length > 0 ? character.terms[character.terms.length - 1] : null;

  return (
    <div
      role={onViewProgress ? 'button' : undefined}
      tabIndex={onViewProgress ? 0 : undefined}
      className={`
        relative bg-zinc-950 border rounded-lg p-3 transition-all
        ${isCurrentUser ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-800 hover:border-zinc-700'}
        ${onViewProgress ? 'cursor-pointer hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2' : ''}
      `}
      onClick={onViewProgress}
      onKeyDown={(e) => {
        if (!onViewProgress) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewProgress();
        }
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-baseline gap-2">
            <Dice5 className="w-3 h-3 text-subtle" />
            <span className="text-default font-medium text-sm">
              {character.name ? `"${character.name}"` : 'Unnamed Character'}
            </span>
            {isGM && <span className="text-xs text-amber-400">(GM)</span>}
          </div>
          <div className="text-subtle text-xs ml-5 mt-0.5">
            {currentTerm
              ? `${currentTerm.careerId} (Term ${currentTerm.termNumber})`
              : 'Not started'}
          </div>
          {awareness?.step && (
            <div className="text-subtle text-xs ml-5 mt-0.5 italic">
              Currently: {awareness.step.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>

      <div className="ml-5">
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-subtle uppercase font-medium">
          <span>{character.status.replace('_', ' ')}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {onViewProgress && (
        <button
          type="button"
          aria-label={`View progress for ${character.name || 'unnamed character'}`}
          className="mt-2 ml-5 px-2 min-h-[44px] text-xs text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 rounded"
        >
          [View Progress]
        </button>
      )}

      {isCurrentUser && (
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}
    </div>
  );
}
