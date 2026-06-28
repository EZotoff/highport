'use client';

import { BookMarked } from 'lucide-react';
import type { ChapterSummary } from '../../lib/chargen/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { formatChapterNumeral } from './ChapterCard';

interface ServiceRecordProps {
  chapters: ChapterSummary[];
  characterName?: string;
}

export function ServiceRecord({ chapters, characterName }: ServiceRecordProps) {
  return (
    <section className="rounded-xl border border-violet-500/30 bg-zinc-950/90 p-4 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-start gap-3 border-b border-zinc-800 pb-3">
        <BookMarked className="mt-1 h-5 w-5 shrink-0" style={{ color: THEME_HEX.violet }} />
        <div>
          <h2 className="font-display text-xl font-bold text-heading">Service Record</h2>
          <p className="text-xs leading-5 text-label">
            {characterName || 'This traveller'} recorded {chapters.length} chapter
            {chapters.length === 1 ? '' : 's'} of service.
          </p>
        </div>
      </div>

      {chapters.length === 0 ? (
        <p className="text-sm italic text-subtle">
          No completed terms have been entered in the record.
        </p>
      ) : (
        <ol className="space-y-4">
          {chapters.map((chapter) => (
            <li key={`${chapter.termNumber}-${chapter.careerId}`} className="relative pl-5">
              <div className="absolute left-0 top-1 h-full w-px bg-gradient-to-b from-violet-400/60 to-transparent" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-label font-mono">
                Chapter {formatChapterNumeral(chapter.termNumber)} · Age {chapter.age}
              </div>
              <h3 className="mt-1 font-display text-base font-semibold text-heading">
                {chapter.careerName}
              </h3>
              {chapter.drafted && (
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-amber-200">
                  Conscripted service
                </div>
              )}
              <p className="mt-2 text-sm leading-6 text-label">{chapter.keyEventDescription}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-subtle">
                {chapter.skillsGained.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-emerald-950/30 px-2 py-0.5 text-emerald-200"
                  >
                    {skill}
                  </span>
                ))}
                {chapter.rankChange && <span>{chapter.rankChange}</span>}
                {chapter.agingEffect && <span>Aging: {chapter.agingEffect}</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
