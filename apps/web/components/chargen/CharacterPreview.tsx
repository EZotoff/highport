'use client';

import React, { useState } from 'react';
import { ChevronRight, User, Coins, Calendar, Scroll, BookMarked } from 'lucide-react';
import { useCharacter } from '../../lib/chargen/hooks';
import { getCharacteristicModifier, CharacteristicCode } from '@highport/mgt2e';
import { LifepathTimeline } from './LifepathTimeline';
import { ServiceRecord } from './ServiceRecord';
import {
  GlassPanel,
  ProcessFlowSheen,
  SciFiButton,
  SciFiDialog,
  SkillBadge,
} from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { ANIMATION_TIMING } from '@/lib/design-system/visualConfig';

interface CharacterPreviewProps {
  characterId?: string | null;
}

const PREVIEW_STATS: CharacteristicCode[] = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'];

export default function CharacterPreview({ characterId }: CharacterPreviewProps) {
  const character = useCharacter(characterId || null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showServiceRecord, setShowServiceRecord] = useState(false);

  if (!character) {
    return (
      <GlassPanel
        theme="cyan"
        variant="default"
        className="p-4 h-full flex flex-col"
        data-testid="character-preview"
      >
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
    <GlassPanel
      theme="cyan"
      variant="default"
      className="p-3 h-full flex flex-col"
      data-testid="character-preview"
    >
      <ProcessFlowSheen duration={5} />

      <div
        className="flex items-center gap-2 mb-3 pb-2 border-b"
        style={{ borderColor: `${THEME_HEX.cyan}20` }}
      >
        <User className="w-5 h-5" style={{ color: THEME_HEX.cyan }} />
        <h3 className="text-lg font-bold text-heading font-display">Character Sheet</h3>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-2">
          <div className="min-w-0 flex-1">
            <div
              className="block text-[10px] uppercase font-mono tracking-wider mb-0.5"
              style={{ color: THEME_HEX.cyan }}
            >
              Name
            </div>
            <div
              className={`text-sm font-semibold leading-tight break-words ${character.name ? 'text-heading' : 'text-subtle italic'}`}
            >
              {character.name || 'Unnamed Character'}
            </div>
          </div>

          <div className="flex gap-1.5 shrink-0">
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{
                backgroundColor: `${THEME_HEX.violet}15`,
                border: `1px solid ${THEME_HEX.violet}30`,
              }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: THEME_HEX.violet }} />
              <div>
                <div className="text-[9px] uppercase text-subtle leading-none">Age</div>
                <div className="text-sm font-mono text-heading leading-none mt-0.5">
                  {character.age}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{
                backgroundColor: `${THEME_HEX.amber}15`,
                border: `1px solid ${THEME_HEX.amber}30`,
              }}
            >
              <Coins className="w-3.5 h-3.5" style={{ color: THEME_HEX.amber }} />
              <div>
                <div className="text-[9px] uppercase text-subtle leading-none">Credits</div>
                <div className="text-sm font-mono text-heading leading-none mt-0.5">
                  Cr{character.credits.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div data-testid="character-characteristics">
          <div
            className="block text-[10px] uppercase font-mono tracking-wider mb-1.5"
            style={{ color: THEME_HEX.cyan }}
          >
            Characteristics
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PREVIEW_STATS.map((stat) => {
              const val = character.characteristics[stat] ?? 0;
              const mod = getCharacteristicModifier(val);
              const isHigh = val >= 9;
              const isLow = val <= 5;

              return (
                <div
                  key={stat}
                  className="p-1.5 rounded-lg text-center transition-all"
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
                    className="text-[10px] font-mono font-bold"
                    style={{
                      color: isHigh ? THEME_HEX.emerald : isLow ? THEME_HEX.red : THEME_HEX.cyan,
                    }}
                  >
                    {stat}
                  </div>
                  <div className="text-lg font-mono font-bold text-heading leading-none my-0.5">
                    {val}
                  </div>
                  <div
                    className="text-[10px] font-mono leading-none"
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
            className="block text-[10px] uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Current Career
          </div>
          <div className="text-label text-sm">
            {character.terms.length > 0 ? (
              <span
                className="px-2 py-0.5 rounded text-xs inline-block"
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
              <span className="text-subtle italic text-xs">None</span>
            )}
          </div>
        </div>

        <div data-testid="character-skills">
          <div
            className="block text-[10px] uppercase font-mono tracking-wider mb-1"
            style={{ color: THEME_HEX.cyan }}
          >
            Skills ({skillCount})
          </div>
          {skillCount === 0 ? (
            <div className="text-subtle text-xs italic">No skills learned yet</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {Object.entries(character.skills || {}).map(([skill, level]) => (
                <SkillBadge key={skill} skill={skill} level={level as number} theme="emerald" />
              ))}
            </div>
          )}
        </div>

        {character.terms.length > 0 && (
          <div
            className="pt-2.5 border-t space-y-2"
            style={{ borderColor: 'var(--asteroid-dust-30)' }}
          >
            <SciFiButton
              onClick={() => setShowTimeline(true)}
              theme="violet"
              scifiVariant="outline"
              size="sm"
              aria-haspopup="dialog"
              aria-expanded={showTimeline}
              className="w-full min-h-[36px]"
              data-testid="open-career-timeline"
            >
              <Scroll className="w-3.5 h-3.5" />
              <span className="ml-1.5">Career Timeline ({character.terms.length} terms)</span>
              <ChevronRight className="w-3.5 h-3.5 ml-auto" />
            </SciFiButton>
            {character.status === 'finalized' && (
              <SciFiButton
                onClick={() => setShowServiceRecord(true)}
                theme="violet"
                scifiVariant="outline"
                size="sm"
                aria-haspopup="dialog"
                aria-expanded={showServiceRecord}
                className="w-full min-h-[36px]"
                data-testid="open-service-record"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span className="ml-1.5">
                  Service Record ({character.chapters.length} chapter
                  {character.chapters.length === 1 ? '' : 's'})
                </span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </SciFiButton>
            )}
          </div>
        )}

        <SciFiDialog
          open={showTimeline}
          onOpenChange={setShowTimeline}
          title="Career Timeline"
          description={`${character.name || 'This traveller'} — ${character.terms.length} term${character.terms.length === 1 ? '' : 's'} of service`}
          theme="violet"
          className="max-w-5xl"
        >
          <div className="h-[70vh] min-h-[400px] w-full">
            {characterId && <LifepathTimeline characterId={characterId} />}
          </div>
        </SciFiDialog>

        <SciFiDialog
          open={showServiceRecord}
          onOpenChange={setShowServiceRecord}
          title="Service Record"
          description={`${character.name || 'This traveller'} — ${character.chapters.length} chapter${character.chapters.length === 1 ? '' : 's'} of service`}
          theme="violet"
          className="max-w-3xl"
        >
          <div className="h-[70vh] min-h-[400px] w-full overflow-y-auto">
            <ServiceRecord chapters={character.chapters} characterName={character.name} />
          </div>
        </SciFiDialog>
      </div>

      <div
        className="mt-2 pt-1.5 border-t text-center text-xs font-mono text-subtle"
        style={{ borderColor: 'var(--asteroid-dust-30)' }}
      >
        ID: {character.id.slice(0, 8)}
      </div>
    </GlassPanel>
  );
}
