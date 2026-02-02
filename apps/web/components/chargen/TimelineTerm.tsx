import React, { useState } from 'react';
import { 
  User, MapPin, Package, FileKey, 
  Shield, X, Award, ChevronDown
} from 'lucide-react';
import type { CareerTermResult, SpawnedEntityRef } from '../../lib/chargen/types';
import { TimelineEvent } from './TimelineEvent';
import { GlassPanel, ProcessFlowSheen } from '@/components/ui/scifi';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX, TYPOGRAPHY } from '@/lib/design-system/themeUtils';
import { ANIMATION_TIMING } from '@/lib/design-system/visualConfig';

interface TimelineTermProps {
  term: CareerTermResult;
  career: { id: string; name: string };
  onExpand: () => void;
  onEntityClick?: (entityId: string) => void;
}

export function TimelineTerm({ term, career, onExpand, onEntityClick }: TimelineTermProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isMishap = !!term.mishap;
  const isAdvancement = term.advanced;
  const isCommission = term.commissioned;
  
  const theme: ThemeColor = isMishap ? 'red' : (isAdvancement || isCommission) ? 'amber' : 'cyan';
  const themeHex = THEME_HEX[theme];

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const transitionDuration = `${ANIMATION_TIMING.TRANSITION_ENTER}ms`;

  return (
    <GlassPanel
      theme={theme}
      variant="bordered"
      glow={isMishap || isAdvancement}
      className={`w-[240px] shrink-0 cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] ${isMishap ? 'animate-pulse-danger' : ''}`}
      style={{
        transition: `all ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
        transform: isExpanded ? 'scale(1.02)' : 'scale(1)',
      }}
      onClick={onExpand}
    >
      {/* Energy border gradient */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, var(--plasma-cyan) 0%, var(--impulse-violet) 50%, var(--plasma-cyan) 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 4s ease infinite',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          maskComposite: 'exclude',
          WebkitMaskComposite: 'xor',
          padding: '1px',
          opacity: 0.5,
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-plasma-cyan/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-plasma-cyan/50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-plasma-cyan/50 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-plasma-cyan/50 pointer-events-none" />

      <ProcessFlowSheen duration={4} />
      
      <div 
        className="flex items-center justify-between p-3 border-b relative z-10"
        style={{ borderColor: `${themeHex}20` }}
      >
        <div className="flex flex-col">
          <span 
            className={TYPOGRAPHY.label}
            style={{ color: themeHex }}
          >
            TERM {term.termNumber}
          </span>
          <span 
            className="font-semibold text-sm tracking-wide text-gray-100 truncate max-w-[140px]" 
            title={career.name}
          >
            {career.name}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className={`text-gray-400 ${TYPOGRAPHY.data} text-[10px]`}>AGE {term.startAge}</span>
          {term.survived ? (
            <div 
              className="p-1 rounded shadow-[0_0_8px_rgba(16,185,129,0.5),0_0_16px_rgba(16,185,129,0.25)]"
              style={{ backgroundColor: `${THEME_HEX.emerald}20` }}
            >
              <Shield className="w-3 h-3" style={{ color: THEME_HEX.emerald }} />
            </div>
          ) : (
            <div 
              className="p-1 rounded shadow-[0_0_8px_rgba(239,68,68,0.5),0_0_16px_rgba(239,68,68,0.25)]"
              style={{ backgroundColor: `${THEME_HEX.red}20` }}
            >
              <X className="w-3 h-3" style={{ color: THEME_HEX.red }} />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2 relative z-10">
        {(isAdvancement || isCommission || term.rankGained !== undefined) && (
          <div 
            className={`flex items-center gap-1.5 px-2 py-1 rounded ${TYPOGRAPHY.label} shadow-[0_0_8px_rgba(245,158,11,0.5),0_0_16px_rgba(245,158,11,0.25)]`}
            style={{ 
              backgroundColor: `${THEME_HEX.amber}15`,
              color: THEME_HEX.amber,
              border: `1px solid ${THEME_HEX.amber}30`
            }}
          >
            <Award className="w-3 h-3" />
            <span>
              {isCommission ? 'Commissioned' : 'Promoted'} 
              {term.currentRank > 0 && ` (Rank ${term.currentRank})`}
            </span>
          </div>
        )}

        <TimelineEvent 
          event={term.event} 
          eventDescription={term.eventDescription} 
          mishap={term.mishap} 
        />
        
        {term.spawnedEntities.length > 0 && (
          <div className="mt-1">
            <button
              onClick={handleToggleExpand}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider mb-2 transition-colors"
              style={{ color: THEME_HEX.violet }}
            >
              <ChevronDown 
                className="w-3 h-3 transition-transform"
                style={{ 
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transitionDuration,
                }}
              />
              <span>{term.spawnedEntities.length} Encounter{term.spawnedEntities.length > 1 ? 's' : ''}</span>
            </button>
            
            <div 
              className="overflow-hidden"
              style={{
                maxHeight: isExpanded ? `${term.spawnedEntities.length * 32}px` : '0px',
                opacity: isExpanded ? 1 : 0,
                transition: `all ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
              }}
            >
              <div 
                className="flex flex-wrap gap-1.5 pt-2 border-t"
                style={{ borderColor: 'var(--asteroid-dust-30)' }}
              >
                {term.spawnedEntities.map((entity, i) => (
                  <EntityBadge 
                    key={`${entity.graphNodeId}-${i}`} 
                    entity={entity} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEntityClick?.(entity.graphNodeId);
                    }} 
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {term.skillsGained.length > 0 && (
          <div 
            className="flex flex-wrap gap-1 pt-2 border-t"
            style={{ borderColor: 'var(--asteroid-dust-30)' }}
          >
            {term.skillsGained.slice(0, isExpanded ? undefined : 3).map((skill, i) => (
              <span 
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                style={{
                  backgroundColor: `${THEME_HEX.emerald}15`,
                  color: THEME_HEX.emerald,
                  border: `1px solid ${THEME_HEX.emerald}20`,
                }}
              >
                {skill.skill} {skill.level}
              </span>
            ))}
            {!isExpanded && term.skillsGained.length > 3 && (
              <span className="text-[9px] text-gray-500">
                +{term.skillsGained.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <div 
        className="h-0.5 transition-all group-hover:opacity-100 opacity-0"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${themeHex}, transparent)`,
          transitionDuration,
        }}
      />
    </GlassPanel>
  );
}

function EntityBadge({ entity, onClick }: { entity: SpawnedEntityRef; onClick: (e: React.MouseEvent) => void }) {
  const getIcon = () => {
    switch (entity.type) {
      case 'npc': return <User className="w-3 h-3" />;
      case 'location': return <MapPin className="w-3 h-3" />;
      case 'item': return <Package className="w-3 h-3" />;
      case 'secret': return <FileKey className="w-3 h-3" />;
      default: return <div className="w-3 h-3 rounded-full bg-gray-500" />;
    }
  };

  const getStyles = (): { color: string; bgColor: string; borderColor: string } => {
    switch (entity.relationship) {
      case 'enemy': return { color: THEME_HEX.red, bgColor: `${THEME_HEX.red}15`, borderColor: `${THEME_HEX.red}30` };
      case 'rival': return { color: THEME_HEX.amber, bgColor: `${THEME_HEX.amber}15`, borderColor: `${THEME_HEX.amber}30` };
      case 'ally': return { color: THEME_HEX.emerald, bgColor: `${THEME_HEX.emerald}15`, borderColor: `${THEME_HEX.emerald}30` };
      case 'contact': return { color: THEME_HEX.cyan, bgColor: `${THEME_HEX.cyan}15`, borderColor: `${THEME_HEX.cyan}30` };
      default: return { color: THEME_HEX.slate, bgColor: `${THEME_HEX.slate}15`, borderColor: `${THEME_HEX.slate}30` };
    }
  };

  const styles = getStyles();

  return (
    <div 
      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-all hover:brightness-125"
      style={{ 
        color: styles.color, 
        backgroundColor: styles.bgColor, 
        border: `1px solid ${styles.borderColor}`,
        transitionDuration: `${ANIMATION_TIMING.TRANSITION_EXIT}ms`,
      }}
      onClick={onClick}
      title={`${entity.name} (${entity.relationship || entity.type})`}
    >
      {getIcon()}
      <span className="max-w-[70px] truncate">{entity.name}</span>
    </div>
  );
}
