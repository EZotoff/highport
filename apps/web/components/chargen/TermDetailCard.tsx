import React, { useEffect, useState } from 'react';
import {
  User,
  MapPin,
  Box,
  Key,
  ShieldAlert,
  Trophy,
  Briefcase,
  ExternalLink,
  Dices,
  X,
} from 'lucide-react';
import type { CareerTermResult, SpawnedEntityRef } from '../../lib/chargen/types';
import { unwrapAIField } from '../../lib/chargen/types';
import { GlassPanel, ProcessFlowSheen, DiceRollDisplay } from '../ui/scifi';
import { THEME_HEX, TYPOGRAPHY } from '@/lib/design-system/themeUtils';
import { ANIMATION_TIMING } from '@/lib/design-system/visualConfig';

interface TermDetailCardProps {
  term: CareerTermResult;
  career: { id: string; name: string };
  isOpen: boolean;
  onClose: () => void;
  onEntityClick?: (entityId: string) => void;
}

export function TermDetailCard({
  term,
  career,
  isOpen,
  onClose,
  onEntityClick,
}: TermDetailCardProps) {
  const [isVisible, setIsVisible] = useState(isOpen);
  const modalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else {
      const timer = setTimeout(() => setIsVisible(false), ANIMATION_TIMING.TRANSITION_EXIT);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const container = modalRef.current;
    const selectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
      (el) => !el.hasAttribute('disabled'),
    );
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(selectors)).filter(
        (el) => !el.hasAttribute('disabled'),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isVisible) return null;

  const themeColor = term.mishap ? 'red' : term.survived ? 'violet' : 'slate';
  const themeHex = THEME_HEX[themeColor];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: 'var(--deep-void-80)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <GlassPanel
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="term-detail-title"
        theme={themeColor}
        variant="bordered"
        glow
        className={`w-full max-w-2xl shadow-2xl transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <ProcessFlowSheen duration={4} />

        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: `linear-gradient(90deg, ${themeHex}15 0%, transparent 100%)`,
            borderBottom: `1px solid ${themeHex}30`,
          }}
        >
          <div>
            <div
              className={`flex items-center gap-2 ${TYPOGRAPHY.label}`}
              style={{ color: themeHex }}
            >
              Term {term.termNumber}
            </div>
            <h2
              id="term-detail-title"
              className={`flex items-center gap-2 mt-1 text-heading ${TYPOGRAPHY.subheading}`}
            >
              <Briefcase className="w-5 h-5" style={{ color: THEME_HEX.violet }} />
              {career.name}
              <span className="text-subtle font-normal text-sm">({term.assignmentId})</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`text-subtle ${TYPOGRAPHY.label}`}>Age</div>
              <div className={`text-default ${TYPOGRAPHY.data} text-lg`}>
                {term.startAge} <span style={{ color: themeHex }}>→</span> {term.startAge + 4}
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Close term details"
              className="p-2 min-w-[44px] min-h-[44px] rounded-lg transition-all duration-200 border hover:-translate-y-0.5 hover:border-[var(--hover-color)] hover:text-[var(--hover-color)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2"
              style={{
                background: 'var(--star-metal-50)',
                borderColor: 'var(--asteroid-dust-50)',
                color: '#94a3b8',
                ['--hover-color' as string]: themeHex,
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <section className="space-y-3">
            <h3
              className={`flex items-center gap-2 ${TYPOGRAPHY.label}`}
              style={{ color: THEME_HEX.cyan }}
            >
              <Dices className="w-4 h-4" />
              Key Rolls
            </h3>
            <div className="grid gap-3">
              {term.survivalRoll && (
                <div className="space-y-1">
                  <span className={`text-subtle ${TYPOGRAPHY.label}`}>Survival</span>
                  <DiceRollDisplay
                    dice={term.survivalRoll.dice}
                    rolls={term.survivalRoll.rolls}
                    total={term.survivalRoll.total}
                    modifier={term.survivalRoll.modifier}
                    target={term.survivalRoll.target}
                    success={term.survived}
                    attribute="INT"
                  />
                </div>
              )}
              {term.commissionRoll && (
                <div className="space-y-1">
                  <span className={`text-subtle ${TYPOGRAPHY.label}`}>Commission</span>
                  <DiceRollDisplay
                    dice={term.commissionRoll.dice}
                    rolls={term.commissionRoll.rolls}
                    total={term.commissionRoll.total}
                    modifier={term.commissionRoll.modifier}
                    target={term.commissionRoll.target}
                    success={!!term.commissioned}
                    attribute="SOC"
                  />
                </div>
              )}
              {term.advancementRoll && (
                <div className="space-y-1">
                  <span className={`text-subtle ${TYPOGRAPHY.label}`}>Advancement</span>
                  <DiceRollDisplay
                    dice={term.advancementRoll.dice}
                    rolls={term.advancementRoll.rolls}
                    total={term.advancementRoll.total}
                    modifier={term.advancementRoll.modifier}
                    target={term.advancementRoll.target}
                    success={term.advanced}
                    attribute="EDU"
                  />
                </div>
              )}
              {term.eventRoll && (
                <div className="space-y-1">
                  <span className={`text-subtle ${TYPOGRAPHY.label}`}>Event</span>
                  <DiceRollDisplay
                    dice={term.eventRoll.dice}
                    rolls={term.eventRoll.rolls}
                    total={term.eventRoll.total}
                    compact
                  />
                </div>
              )}
            </div>
          </section>

          {(unwrapAIField(term.eventDescription) || term.mishap) && (
            <section className="space-y-3">
              <h3
                className={`flex items-center gap-2 ${TYPOGRAPHY.label}`}
                style={{ color: term.mishap ? THEME_HEX.red : THEME_HEX.amber }}
              >
                {term.mishap ? <ShieldAlert className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                {term.mishap ? 'Mishap' : 'Life Event'}
              </h3>
              <div
                className="p-4 rounded-lg"
                style={{
                  background: term.mishap ? 'rgba(239, 68, 68, 0.1)' : 'var(--star-metal-60)',
                  border: `1px solid ${term.mishap ? 'rgba(239, 68, 68, 0.3)' : 'var(--asteroid-dust-50)'}`,
                }}
              >
                <p className="text-default leading-relaxed">
                  {unwrapAIField(term.eventDescription) ||
                    term.mishap?.description ||
                    term.eventChoice ||
                    'No details available.'}
                </p>
              </div>
            </section>
          )}

          {term.spawnedEntities.length > 0 && (
            <section className="space-y-3">
              <h3
                className={`flex items-center gap-2 ${TYPOGRAPHY.label}`}
                style={{ color: THEME_HEX.violet }}
              >
                <User className="w-4 h-4" />
                Encounters
              </h3>
              <div className="grid gap-3">
                {term.spawnedEntities.map((entity, i) => (
                  <EntityCard key={i} entity={entity} onClick={onEntityClick} />
                ))}
              </div>
            </section>
          )}

          {term.skillsGained.length > 0 && (
            <section className="space-y-3">
              <h3
                className={`flex items-center gap-2 ${TYPOGRAPHY.label}`}
                style={{ color: THEME_HEX.emerald }}
              >
                <Trophy className="w-4 h-4" />
                Skills Gained
              </h3>
              <div className="flex flex-wrap gap-2">
                {term.skillsGained.map((skill, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md"
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span className="text-sm font-medium" style={{ color: THEME_HEX.emerald }}>
                      {skill.skill}
                      {skill.specialty ? `: ${skill.specialty}` : ''}
                    </span>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: THEME_HEX.emerald,
                      }}
                    >
                      {skill.level}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

function EntityCard({
  entity,
  onClick,
}: {
  entity: SpawnedEntityRef;
  onClick?: (id: string) => void;
}) {
  const isHostile = entity.relationship === 'rival' || entity.relationship === 'enemy';
  const entityColor = isHostile ? THEME_HEX.red : THEME_HEX.cyan;

  const Icon =
    {
      npc: User,
      location: MapPin,
      item: Box,
      secret: Key,
    }[entity.type] || User;

  return (
    <div
      className="flex items-start gap-4 p-3 rounded-lg transition-all group hover:border-[var(--entity-color)]"
      style={{
        background: 'var(--star-metal-60)',
        border: `1px solid ${isHostile ? 'rgba(239, 68, 68, 0.3)' : 'var(--asteroid-dust-50)'}`,
        ['--entity-color' as string]: entityColor,
      }}
    >
      <div
        className="mt-1 p-2 rounded-lg"
        style={{
          background: `${entityColor}20`,
          color: entityColor,
        }}
      >
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-heading truncate">{entity.name}</h4>
          {entity.relationship && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold"
              style={{
                background: `${entityColor}20`,
                color: entityColor,
              }}
            >
              {entity.relationship}
            </span>
          )}
        </div>
        {entity.description && (
          <p className="text-xs text-subtle mt-1 line-clamp-2">{entity.description}</p>
        )}
      </div>

      {onClick && (
        <button
          type="button"
          aria-label={`View ${entity.name} in graph`}
          onClick={() => onClick(entity.graphNodeId)}
          className="p-2 min-w-[44px] min-h-[44px] rounded-md transition-all opacity-0 group-hover:opacity-100 hover:bg-[var(--star-metal-80)] hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2"
          style={{
            color: '#94a3b8',
          }}
          title="View in Graph"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
