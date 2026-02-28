'use client';

import React, { useState } from 'react';
import { ChevronRight, User, Coins, Calendar } from 'lucide-react';
import { useCharacter } from '../../lib/chargen/hooks';
import { getCharacteristicModifier, CharacteristicCode } from '@highport/mgt2e';
import { LifepathTimeline } from './LifepathTimeline';
import { GlassPanel, ProcessFlowSheen, SkillBadge } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { ANIMATION_TIMING } from '@/lib/design-system/visualConfig';

interface CharacterPreviewProps {
  characterId?: string | null;
}

const PREVIEW_STATS: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function CharacterPreview({ characterId }: CharacterPreviewProps) {
  const character = useCharacter(characterId || null);
  const [showLifepath, setShowLifepath] = useState(false);

  if (!character) {
    return (
      <GlassPanel theme="cyan" variant="default" className="p-4 h-full flex flex-col">
        <div
          className="flex items-center gap-2 mb-3 pb-2 border-b"
          style={{ borderColor: `${THEME_HEX.cyan}20` }}
        >
          <User className="w-5 h-5" style={{ color: THEME_HEX.cyan }} />
          <h3 className="text-lg font-bold text-heading font-display">Character Sheet</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-subtle text-sm italic">
          No character selected
        </div>
      </GlassPanel>
    );
  }

  const skillCount = Object.keys(character.skills).length;
  const transitionDuration = `${ANIMATION_TIMING.TRANSITION_ENTER}ms`;

  return (
    <GlassPanel theme="cyan" variant="default" className="p-4 h-full flex flex-col">
      <ProcessFlowSheen duration={5} />

      <div
        className="flex items-center gap-2 mb-3 pb-2 border-b"
        style={{ borderColor: `${THEME_HEX.cyan}20` }}
      >
        <User className="w-5 h-5" style={{ color: THEME_HEX.cyan }} />
        <h3 className="text-lg font-bold text-heading font-display">Character Sheet</h3>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div>
          <div
            className="block text-xs uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Name
          </div>
          <div
            className={`text-lg font-semibold ${character.name ? 'text-heading' : 'text-subtle italic'}`}
          >
            {character.name || 'Unnamed Character'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{
              backgroundColor: `${THEME_HEX.violet}15`,
              border: `1px solid ${THEME_HEX.violet}30`,
            }}
          >
            <Calendar className="w-4 h-4" style={{ color: THEME_HEX.violet }} />
            <div>
              <div className="text-[10px] uppercase text-subtle">Age</div>
              <div className="text-lg font-mono text-heading">{character.age}</div>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{
              backgroundColor: `${THEME_HEX.amber}15`,
              border: `1px solid ${THEME_HEX.amber}30`,
            }}
          >
            <Coins className="w-4 h-4" style={{ color: THEME_HEX.amber }} />
            <div>
              <div className="text-[10px] uppercase text-subtle">Credits</div>
              <div className="text-lg font-mono text-heading">
                Cr{character.credits.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div
            className="block text-xs uppercase font-mono tracking-wider mb-2"
            style={{ color: THEME_HEX.cyan }}
          >
            Characteristics
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PREVIEW_STATS.map((stat) => {
              const val = character.characteristics[stat] ?? 0;
              const mod = getCharacteristicModifier(val);
              const isHigh = val >= 9;
              const isLow = val <= 5;

              return (
                <div
                  key={stat}
                  className="p-2 rounded-lg text-center transition-all"
                  style={{
                    backgroundColor: isHigh
                      ? `${THEME_HEX.emerald}10`
                      : isLow
                        ? `${THEME_HEX.red}10`
                        : 'rgba(26, 31, 46, 0.6)',
                    border: `1px solid ${isHigh ? THEME_HEX.emerald : isLow ? THEME_HEX.red : 'var(--asteroid-dust-50)'}30`,
                  }}
                >
                  <div
                    className="text-xs font-mono font-bold"
                    style={{
                      color: isHigh ? THEME_HEX.emerald : isLow ? THEME_HEX.red : THEME_HEX.cyan,
                    }}
                  >
                    {stat}
                  </div>
                  <div className="text-xl font-mono font-bold text-heading">{val}</div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: mod >= 0 ? THEME_HEX.emerald : THEME_HEX.red }}
                  >
                    {mod >= 0 ? '+' + mod : mod}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div
            className="block text-xs uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Current Career
          </div>
          <div className="text-label text-sm">
            {character.terms.length > 0 ? (
              <span
                className="px-2 py-1 rounded"
                style={{
                  backgroundColor: `${THEME_HEX.violet}15`,
                  border: `1px solid ${THEME_HEX.violet}30`,
                }}
              >
                {character.terms[character.terms.length - 1].careerId}
                <span className="text-subtle ml-2">
                  Rank {character.terms[character.terms.length - 1].currentRank}
                </span>
              </span>
            ) : (
              <span className="text-subtle italic">None</span>
            )}
          </div>
        </div>

        <div>
          <div
            className="block text-xs uppercase font-mono tracking-wider mb-2"
            style={{ color: THEME_HEX.cyan }}
          >
            Skills ({skillCount})
          </div>
          {skillCount === 0 ? (
            <div className="text-subtle text-sm italic">No skills learned yet</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(character.skills || {}).map(([skill, level]) => (
                <SkillBadge key={skill} skill={skill} level={level as number} theme="emerald" />
              ))}
            </div>
          )}
        </div>

        {character.terms.length > 0 && (
          <div className="pt-4 border-t" style={{ borderColor: 'var(--asteroid-dust-30)' }}>
            <button
              onClick={() => setShowLifepath(!showLifepath)}
              type="button"
              aria-expanded={showLifepath}
              aria-controls="character-preview-lifepath"
              className="flex items-center gap-2 text-xs uppercase font-mono tracking-wider transition-colors w-full group min-h-[44px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2 rounded"
              style={{ color: THEME_HEX.violet }}
            >
              <span
                className="transition-transform"
                style={{
                  transform: showLifepath ? 'rotate(90deg)' : 'rotate(0deg)',
                  transitionDuration,
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </span>
              <span className="group-hover:brightness-125 transition-all">
                Career Timeline ({character.terms.length} terms)
              </span>
            </button>
            <div
              id="character-preview-lifepath"
              className="overflow-hidden"
              style={{
                maxHeight: showLifepath ? '500px' : '0px',
                opacity: showLifepath ? 1 : 0,
                transition: `all ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              {characterId && (
                <div className="mt-3 -mx-6 px-2">
                  <LifepathTimeline characterId={characterId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-3 pt-2 border-t text-center text-xs font-mono text-subtle"
        style={{ borderColor: 'var(--asteroid-dust-30)' }}
      >
        ID: {character.id.slice(0, 8)}
      </div>
    </GlassPanel>
  );
}
