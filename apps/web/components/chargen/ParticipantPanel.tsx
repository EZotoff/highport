'use client';

import React from 'react';
import { useAllCharacters, useSession } from '../../lib/chargen/hooks';
import type { ChargenCharacter } from '../../lib/chargen/types';

interface ParticipantPanelProps {
  currentUserId?: string;
  onViewCharacter?: (charId: string) => void;
}

function calculateProgress(character: ChargenCharacter): number {
  // background = 0-20%, career_selection = 20-30%, term_resolution = 30-80%, mustering_out = 80-95%, finalized = 100%
  switch (character.status) {
    case 'background': return character.backgroundSkills.length > 0 ? 15 : 5;
    case 'career_selection': return 25;
    case 'term_resolution': return 30 + (character.currentTermIndex * 10);
    case 'mustering_out': return 90;
    case 'finalized': return 100;
    default: return 0;
  }
}

export default function ParticipantPanel({ currentUserId, onViewCharacter }: ParticipantPanelProps) {
  const characters = useAllCharacters();
  const session = useSession();

  if (!session) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-full flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Loading session...</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Session Participants</h3>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto flex-1">
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg" role="img" aria-label="Game Master">👑</span>
            <div className="flex flex-col">
              <span className="text-zinc-200 font-medium text-sm">Game Master</span>
              <span className="text-zinc-500 text-xs">Watching</span>
            </div>
          </div>
        </div>

        {characters.map((char) => {
          const progress = calculateProgress(char);
          const isCurrentUser = currentUserId === char.playerId;
          const currentTerm = char.terms.length > 0 ? char.terms[char.terms.length - 1] : null;
          
          return (
            <div 
              key={char.id}
              onClick={() => onViewCharacter?.(char.id)}
              className={`
                relative bg-zinc-950 border rounded-lg p-3 transition-all
                ${isCurrentUser ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-800 hover:border-zinc-700'}
                ${onViewCharacter ? 'cursor-pointer hover:bg-zinc-900' : ''}
              `}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-500 text-xs" role="img" aria-label="Player">🎲</span>
                    <span className="text-zinc-200 font-medium text-sm">
                      {char.name ? `"${char.name}"` : 'Unnamed Character'}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-xs ml-5 mt-0.5">
                    {currentTerm 
                      ? `${currentTerm.careerId} (Term ${currentTerm.termNumber})` 
                      : 'Not started'}
                  </div>
                </div>
              </div>

              <div className="ml-5">
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-1">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-medium">
                  <span>{char.status.replace('_', ' ')}</span>
                  <span>{progress}%</span>
                </div>
              </div>

              {isCurrentUser && (
                <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              )}
            </div>
          );
        })}

        {characters.length === 0 && (
          <div className="text-center py-8 text-zinc-600 text-sm italic border-2 border-dashed border-zinc-800 rounded-lg">
            No characters created yet
          </div>
        )}
      </div>
    </div>
  );
}
