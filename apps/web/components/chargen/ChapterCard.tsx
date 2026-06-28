'use client';

import { AlertTriangle, BookOpen, Medal } from 'lucide-react';
import type { ChapterSummary } from '../../lib/chargen/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface ChapterCardProps {
  chapter: ChapterSummary;
}

const ROMAN_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
] as const;

export function formatChapterNumeral(termNumber: number): string {
  return ROMAN_NUMERALS[termNumber - 1] ?? String(termNumber);
}

export function ChapterCard({ chapter }: ChapterCardProps) {
  const chapterNumber = formatChapterNumeral(chapter.termNumber);

  return (
    <article className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-zinc-950/85 p-5 shadow-2xl shadow-black/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
      <div className="absolute right-4 top-4 text-6xl font-display font-bold leading-none text-amber-500/10">
        {chapterNumber}
      </div>

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-label font-mono">
              <BookOpen className="h-3.5 w-3.5" style={{ color: THEME_HEX.amber }} />
              Chapter {chapterNumber}
            </div>
            <h3 className="mt-2 font-display text-xl font-bold text-heading">
              {chapter.careerName} — Term {chapter.termNumber}
            </h3>
          </div>
          <div className="shrink-0 rounded border border-cyan-400/30 bg-cyan-950/30 px-3 py-1 text-right font-mono text-xs text-label">
            Age <span className="text-heading">{chapter.age}</span>
          </div>
        </div>

        {chapter.drafted && (
          <div className="inline-flex rounded border border-amber-400/40 bg-amber-950/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
            Conscripted service
          </div>
        )}

        <p className="border-l-2 border-amber-400/50 pl-4 text-sm leading-6 text-label">
          {chapter.keyEventDescription}
        </p>

        <div className="grid gap-3 text-xs text-label sm:grid-cols-2">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
              Skills Gained
            </div>
            {chapter.skillsGained.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {chapter.skillsGained.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-emerald-950/40 px-2 py-0.5 text-emerald-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <span className="italic text-subtle">No formal training recorded</span>
            )}
          </div>

          <div className="space-y-2">
            {chapter.rankChange && (
              <div className="flex items-center gap-2">
                <Medal className="h-3.5 w-3.5" style={{ color: THEME_HEX.violet }} />
                <span>{chapter.rankChange}</span>
              </div>
            )}
            {chapter.mishap && (
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Mishap recorded</span>
              </div>
            )}
            {chapter.agingEffect && <div>Aging: {chapter.agingEffect}</div>}
          </div>
        </div>
      </div>
    </article>
  );
}
