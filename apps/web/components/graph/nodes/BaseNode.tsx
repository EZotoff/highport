import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getNodeConfig } from './node-config';
import { Lock, EyeOff } from 'lucide-react';
import { THEME_HEX, TYPOGRAPHY } from '@/lib/design-system/themeUtils';

const BaseNode = memo(({ data, selected, type }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const config = getNodeConfig(type);
  const description = data.description as string | undefined;
  const isLocked = data.locked as boolean;
  const isHidden = data.hidden as boolean;
  const portraitUrl = data.image_url as string | undefined;

  const Icon = config.icon;

  const getBoxShadow = () => {
    if (selected) {
      return `0 0 15px ${config.themeHex}50, 0 0 30px ${config.themeHex}30, 0 0 45px ${config.themeHex}15, 0 10px 30px rgba(0,0,0,0.4)`;
    }
    if (isHovered) {
      return `0 0 15px ${config.themeHex}25, 0 10px 30px rgba(0,0,0,0.4)`;
    }
    return '0 10px 30px rgba(0,0,0,0.4)';
  };

  const getBorderStyle = () => {
    const baseStyle = isHidden ? 'dashed' : 'solid';
    if (selected) {
      return { borderWidth: '2px', borderColor: config.themeHex, borderStyle: baseStyle };
    }
    if (isHovered) {
      return { borderWidth: '1px', borderColor: `${config.themeHex}60`, borderStyle: baseStyle };
    }
    return { borderWidth: '1px', borderColor: 'var(--asteroid-dust-50)', borderStyle: baseStyle };
  };

  const getHandleGlow = () => {
    if (selected) {
      return `0 0 8px ${THEME_HEX.cyan}, 0 0 16px ${THEME_HEX.cyan}80, 0 0 24px ${THEME_HEX.cyan}40`;
    }
    if (isHovered) {
      return `0 0 10px ${THEME_HEX.cyan}80`;
    }
    return `0 0 6px ${THEME_HEX.cyan}50`;
  };

  return (
    <div
      className="relative px-4 py-3 shadow-lg rounded-lg transition-all duration-200 min-w-[180px] group"
      style={{
        background: 'var(--nebula-mist-90)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        ...getBorderStyle(),
        boxShadow: getBoxShadow(),
        opacity: isHidden ? 0.6 : 1,
        cursor: isLocked ? 'not-allowed' : 'grab',
        transform: isHovered && !selected ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all 0.3s ease-out',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="absolute inset-0 pointer-events-none rounded-lg opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {selected && (
        <div className="absolute inset-[-8px] rounded-lg border border-plasma-cyan/20 animate-spin-slow pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-plasma-cyan rounded-full shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
        </div>
      )}

      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !border-2 transition-all duration-200"
        style={{
          top: -6,
          backgroundColor: THEME_HEX.cyan,
          borderColor: '#1a1f2e',
          boxShadow: getHandleGlow(),
          transform: isHovered || selected ? 'scale(1.2)' : 'scale(1)',
        }}
      />
      
      <div className="flex items-start gap-3">
        <div 
          className="flex items-center justify-center w-10 h-10 rounded-full text-xl shrink-0"
          style={{
            backgroundColor: `${config.themeHex}20`,
            color: config.themeHex
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="font-bold text-sm tracking-wide text-gray-100 leading-tight break-words">{data.label as string}</div>
          {description && (
            <div className={`mt-1 line-clamp-2 text-gray-400 ${TYPOGRAPHY.secondary} text-xs`}>{description}</div>
          )}
        </div>
      </div>

      <div className="absolute -top-2 -right-2 flex gap-1 pointer-events-none">
        {portraitUrl && (
          <div
            className="w-8 h-8 rounded-full overflow-hidden border border-asteroid-dust-50 shadow-lg"
            style={{ backgroundColor: '#0d111a' }}
          >
            <img
              src={portraitUrl}
              alt="Portrait"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {isLocked && (
          <div 
            className="p-1 rounded-full border shadow-sm text-xs"
            style={{
              backgroundColor: '#1a1f2e',
              borderColor: 'var(--asteroid-dust-50)',
              color: THEME_HEX.amber
            }}
          >
            <Lock className="w-3 h-3" />
          </div>
        )}
        {isHidden && (
          <div 
            className="p-1 rounded-full border shadow-sm text-xs"
            style={{
              backgroundColor: '#1a1f2e',
              borderColor: 'var(--asteroid-dust-50)',
              color: THEME_HEX.violet
            }}
          >
            <EyeOff className="w-3 h-3" />
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !border-2 transition-all duration-200"
        style={{
          bottom: -6,
          backgroundColor: THEME_HEX.cyan,
          borderColor: '#1a1f2e',
          boxShadow: getHandleGlow(),
          transform: isHovered || selected ? 'scale(1.2)' : 'scale(1)',
        }}
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';

export default BaseNode;
