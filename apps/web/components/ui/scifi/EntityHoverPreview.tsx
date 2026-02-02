import React, { useState, useRef, useEffect } from 'react';
import { User, MapPin, Box, Key } from 'lucide-react';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { GlassPanel } from './GlassPanel';

interface EntityPreviewData {
  id: string;
  name: string;
  type: 'npc' | 'location' | 'item' | 'secret';
  relationship?: string;
  description?: string;
}

interface EntityHoverPreviewProps {
  entity: EntityPreviewData;
  children: React.ReactNode;
  disabled?: boolean;
}

export function EntityHoverPreview({ entity, children, disabled = false }: EntityHoverPreviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isHostile = entity.relationship === 'rival' || entity.relationship === 'enemy';
  const themeColor = isHostile ? 'red' : entity.type === 'npc' ? 'violet' : entity.type === 'location' ? 'cyan' : 'amber';
  const themeHex = THEME_HEX[themeColor];

  const Icon = {
    npc: User,
    location: MapPin,
    item: Box,
    secret: Key
  }[entity.type] || User;

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled) return;
    
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }
      setIsVisible(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="inline-block"
    >
      {children}
      
      {isVisible && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <GlassPanel
            theme={themeColor}
            variant="bordered"
            glow
            className="p-3 min-w-[200px] max-w-[280px] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg shrink-0"
                style={{
                  background: `${themeHex}20`,
                  color: themeHex,
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-100 truncate">
                    {entity.name}
                  </span>
                  {entity.relationship && (
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0"
                      style={{
                        background: `${themeHex}20`,
                        color: themeHex,
                      }}
                    >
                      {entity.relationship}
                    </span>
                  )}
                </div>
                
                <div 
                  className="text-[10px] uppercase tracking-wider mt-0.5"
                  style={{ color: themeHex }}
                >
                  {entity.type}
                </div>
                
                {entity.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                    {entity.description}
                  </p>
                )}
              </div>
            </div>
            
            <div 
              className="absolute bottom-0 left-1/2 w-2 h-2 -translate-x-1/2 translate-y-1/2 rotate-45"
              style={{
                background: 'var(--nebula-mist-90)',
                borderRight: `1px solid ${themeHex}30`,
                borderBottom: `1px solid ${themeHex}30`,
              }}
            />
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
