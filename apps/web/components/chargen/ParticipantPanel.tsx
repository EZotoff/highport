'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Dice5, Link2, Copy, Check } from 'lucide-react';
import { useAllCharacters, useSession } from '../../lib/chargen/hooks';
import type { ChargenCharacter } from '../../lib/chargen/types';
import { getSessionId } from '../../lib/sync';

interface ParticipantPanelProps {
  currentUserId?: string;
  onViewCharacter?: (charId: string) => void;
}

function calculateProgress(character: ChargenCharacter): number {
  switch (character.status) {
    case 'background':
      return character.backgroundSkills.length > 0 ? 15 : 5;
    case 'career_selection':
      return 25;
    case 'term_resolution':
      return 30 + character.currentTermIndex * 10;
    case 'mustering_out':
      return 90;
    case 'finalized':
      return 100;
    default:
      return 0;
  }
}

export default function ParticipantPanel({
  currentUserId,
  onViewCharacter,
}: ParticipantPanelProps) {
  const characters = useAllCharacters();
  const session = useSession();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sessionId = getSessionId('graph');
    if (sessionId && !sessionId.endsWith('-server')) {
      setInviteUrl(`${window.location.origin}/chargen/join/${sessionId}`);
    }
  }, []);

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = inviteUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <h3
          className="text-sm font-bold text-subtle uppercase tracking-wider"
          data-testid="participant-panel"
        >
          Session Participants
        </h3>
      </div>

      {inviteUrl && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-950/40" data-testid="invite-section">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-subtle uppercase tracking-wider">
              Invite Link
            </span>
          </div>
          <div className="flex items-stretch gap-1.5">
            <input
              readOnly
              value={inviteUrl}
              data-testid="invite-url"
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-[11px] text-subtle font-mono truncate focus:outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              onClick={handleCopyInvite}
              data-testid="copy-invite-btn"
              aria-label="Copy invite link"
              className="flex items-center justify-center w-8 shrink-0 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" data-testid="copy-success" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-subtle" />
              )}
            </button>
          </div>
        </div>
      )}

      {!session ? (
        <div className="p-4 flex-1 flex items-center justify-center">
          <span className="text-subtle text-sm italic">Waiting for session sync...</span>
        </div>
      ) : (
        <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-default font-medium text-sm">Game Master</span>
                <span className="text-subtle text-xs">Watching</span>
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
                role={onViewCharacter ? 'button' : undefined}
                tabIndex={onViewCharacter ? 0 : undefined}
                onKeyDown={(e) => {
                  if (!onViewCharacter) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onViewCharacter(char.id);
                  }
                }}
                className={`
                  relative bg-zinc-950 border rounded-lg p-3 transition-all
                  ${isCurrentUser ? 'border-blue-500 ring-2 ring-blue-500' : 'border-zinc-800 hover:border-zinc-700'}
                  ${onViewCharacter ? 'cursor-pointer hover:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <Dice5 className="w-3 h-3 text-subtle" />
                      <span className="text-default font-medium text-sm">
                        {char.name ? `"${char.name}"` : 'Unnamed Character'}
                      </span>
                    </div>
                    <div className="text-label text-xs ml-5 mt-0.5">
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
                  <div className="flex justify-between text-[10px] text-label uppercase font-medium">
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
            <div className="text-center py-8 text-subtle text-sm italic border-2 border-dashed border-zinc-800 rounded-lg">
              No characters created yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
