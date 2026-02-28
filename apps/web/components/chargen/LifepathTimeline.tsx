import React from 'react';
import { Scroll, Wallet } from 'lucide-react';
import { getCareer } from '@highport/mgt2e';
import { useLifepath } from '../../lib/chargen/useLifepath';
import { TimelineTerm } from './TimelineTerm';
import { GlassPanel, AnimatedConnection, SilkyChevron } from '@/components/ui/scifi';
import { THEME_HEX, TYPOGRAPHY } from '@/lib/design-system/themeUtils';

interface LifepathTimelineProps {
  characterId: string;
  onEntityClick?: (entityId: string) => void;
}

export function LifepathTimeline({ characterId, onEntityClick }: LifepathTimelineProps) {
  const { character, terms, totalSkills, totalBenefits, isLoading } = useLifepath(characterId);

  if (isLoading || !character) {
    return (
      <GlassPanel variant="elevated" className="w-full h-40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2" style={{ color: THEME_HEX.cyan }}>
          <div
            className="w-6 h-6 rounded-full border-2 animate-spin"
            style={{ borderColor: `${THEME_HEX.cyan}30`, borderTopColor: THEME_HEX.cyan }}
          />
          <span className="text-subtle">Loading lifepath...</span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="flex flex-col w-full h-full overflow-hidden" variant="elevated">
      {/* Header */}
      <div
        className="flex justify-between items-center px-4 py-3"
        style={{
          background: 'var(--star-metal)',
          borderBottom: '1px solid var(--asteroid-dust-50)',
        }}
      >
        <h2 className="text-lg font-bold flex items-center gap-2 font-display">
          <span
            style={{ color: THEME_HEX.cyan }}
            className={`${TYPOGRAPHY.subheading} text-glow-cyan chromatic-text`}
          >
            LIFEPATH:
          </span>
          <span className="text-heading truncate max-w-[200px] sm:max-w-md">
            {character.name || 'Unnamed Character'}
          </span>
        </h2>
        <div
          className="font-mono text-sm px-3 py-1 rounded"
          style={{
            backgroundColor: 'var(--nebula-mist)',
            border: `1px solid ${THEME_HEX.cyan}30`,
            color: THEME_HEX.cyan,
          }}
        >
          AGE: <span className="text-heading font-bold">{character.age}</span>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div
        className="relative flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar"
        style={{ background: 'var(--deep-void)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(100, 116, 139, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 116, 139, 0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative flex flex-col min-w-max p-6 gap-6">
          {terms.length > 0 && (
            <div className="flex px-1 pb-2 relative">
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--plasma-cyan)]/20 to-transparent" />

              {terms.map((term, i) => (
                <div
                  key={`ruler-${i}`}
                  className={`w-[252px] shrink-0 pl-1 ${TYPOGRAPHY.data} text-xs relative group`}
                  style={{ color: `${THEME_HEX.cyan}80` }}
                >
                  <div className="absolute left-0 bottom-0 w-px h-2 bg-[var(--plasma-cyan)]/40 group-hover:h-3 group-hover:bg-[var(--plasma-cyan)] transition-all duration-300" />
                  <span className="group-hover:text-[var(--plasma-cyan)] transition-colors">
                    AGE {term.startAge}
                  </span>
                </div>
              ))}

              <div className="w-12 shrink-0 relative">
                <div className="absolute left-0 bottom-0 w-px h-4 bg-[var(--plasma-cyan)] shadow-[0_0_8px_var(--plasma-cyan)]" />
                <div className="absolute -bottom-1 left-0 -translate-x-[3px] w-1.5 h-1.5 bg-[var(--plasma-cyan)] rounded-full animate-pulse shadow-[0_0_6px_var(--plasma-cyan)]" />
                <div
                  className={`pl-2 ${TYPOGRAPHY.data} text-xs font-bold text-glow-cyan`}
                  style={{ color: THEME_HEX.cyan }}
                >
                  {character.age}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-0">
            {terms.length === 0 ? (
              <div
                className="h-48 flex flex-col items-center justify-center w-[600px] rounded-lg relative overflow-hidden group"
                style={{
                  backgroundColor: 'rgba(10, 13, 20, 0.4)',
                  border: '1px dashed var(--asteroid-dust)',
                }}
              >
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at center, var(--plasma-cyan) 0.5px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />

                <div className="text-subtle mb-4 group-hover:text-[var(--plasma-cyan)] transition-colors duration-500">
                  <SilkyChevron
                    className="w-8 h-8 animate-bounce opacity-70"
                    color={THEME_HEX.cyan}
                  />
                </div>

                <p
                  className={`${TYPOGRAPHY.subheading} text-[var(--text-secondary)] mb-2 tracking-widest uppercase text-sm`}
                >
                  Begin Your Journey
                </p>

                <p className={`${TYPOGRAPHY.secondary} text-subtle text-xs`}>
                  Select a starting career to forge your destiny
                </p>

                <div className="absolute inset-0 bg-gradient-to-t from-[var(--plasma-cyan)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>
            ) : (
              terms.map((term, index) => {
                const careerDef = getCareer(term.careerId);
                const careerName = careerDef?.name || 'Unknown Career';

                const nextTerm = terms[index + 1];
                const isCareerChange = nextTerm && nextTerm.careerId !== term.careerId;

                return (
                  <React.Fragment key={`${term.termNumber}-${index}`}>
                    <TimelineTerm
                      term={term}
                      career={{ id: term.careerId, name: careerName }}
                      onExpand={() => {
                        console.log('Expand term:', term);
                      }}
                      onEntityClick={onEntityClick}
                    />
                    {index < terms.length - 1 &&
                      (isCareerChange ? (
                        <div className="shrink-0 w-12 flex items-center justify-center">
                          <SilkyChevron color={THEME_HEX.violet} height={40} duration={4} />
                        </div>
                      ) : (
                        <svg width="16" height="20" className="shrink-0">
                          <AnimatedConnection
                            path="M 0 10 L 16 10"
                            color="cyan"
                            strokeWidth={2}
                            animated={true}
                            dashed={true}
                            glowIntensity="low"
                          />
                        </svg>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="h-px bg-gradient-to-r from-transparent via-[var(--plasma-cyan)]/30 to-transparent w-full" />

        <div
          className="p-4 flex flex-col sm:flex-row gap-6 text-sm relative bg-[var(--star-metal)]"
          style={{
            boxShadow: '0 -5px 15px rgba(0,0,0,0.3)',
          }}
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--plasma-cyan)]/50" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--plasma-cyan)]/50" />

          <div className="flex-1 min-w-[200px]">
            <div
              className={`flex items-center gap-2 mb-2 ${TYPOGRAPHY.label}`}
              style={{ color: THEME_HEX.cyan }}
            >
              <Scroll className="w-3 h-3" /> Skills Gained
            </div>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
              {Object.keys(totalSkills).length > 0 ? (
                Object.entries(totalSkills)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([skill, level]) => (
                    <span
                      key={skill}
                      className={`px-2 py-0.5 rounded ${TYPOGRAPHY.data} text-xs`}
                      style={{
                        backgroundColor: `${THEME_HEX.cyan}10`,
                        border: `1px solid ${THEME_HEX.cyan}30`,
                        color: THEME_HEX.cyan,
                      }}
                    >
                      {skill}-{level}
                    </span>
                  ))
              ) : (
                <span className="italic text-xs" style={{ color: `${THEME_HEX.cyan}60` }}>
                  None yet
                </span>
              )}
            </div>
          </div>

          <div
            className="flex-1 min-w-[200px] border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6"
            style={{ borderColor: 'var(--asteroid-dust-50)' }}
          >
            <div
              className={`flex items-center gap-2 mb-2 ${TYPOGRAPHY.label}`}
              style={{ color: THEME_HEX.emerald }}
            >
              <Wallet className="w-3 h-3" /> Benefits & Assets
            </div>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto custom-scrollbar">
              {totalBenefits.length > 0 ? (
                totalBenefits.map((benefit, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded ${TYPOGRAPHY.data} text-xs`}
                    style={{
                      backgroundColor: `${THEME_HEX.emerald}10`,
                      border: `1px solid ${THEME_HEX.emerald}30`,
                      color: THEME_HEX.emerald,
                    }}
                  >
                    {benefit}
                  </span>
                ))
              ) : (
                <span className="italic text-xs" style={{ color: `${THEME_HEX.emerald}60` }}>
                  None yet
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
