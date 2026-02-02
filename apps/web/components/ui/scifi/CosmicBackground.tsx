import React from 'react';
import { useReducedMotion } from '@/lib/design-system/animationUtils';

interface CosmicBackgroundProps {
  showStars?: boolean;
  showGrid?: boolean;
  showScanlines?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const fullScreen: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  showStars = true,
  showGrid = false,
  showScanlines = false,
  intensity = 'medium',
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  
  const opacityMap = {
    low: 0.3,
    medium: 0.5,
    high: 0.8,
  };
  
  const opacity = opacityMap[intensity];
  
  return (
    <div 
      className={`pointer-events-none overflow-hidden ${className}`}
      style={{ 
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 0,
      }}
    >
      <div 
        className={`animate-nebula-pulse`}
        style={{
          ...fullScreen,
          background: `
            radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, ${0.15 * opacity}) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 240, 255, ${0.1 * opacity}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, ${0.05 * opacity}) 0%, transparent 70%),
            linear-gradient(180deg, #0a0d14 0%, #0f1420 50%, #0a0d14 100%)
          `,
        }}
      />
      
      {showStars && (
        <>
          <div 
            className="star-layer animate-twinkle-slow"
            style={{
              ...fullScreen,
              opacity: opacity * 0.7,
              animation: reducedMotion ? 'none' : undefined,
              backgroundImage: `
                radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 30% 50%, rgba(255,255,255,0.6), transparent),
                radial-gradient(1px 1px at 70% 30%, rgba(255,255,255,0.5), transparent),
                radial-gradient(1px 1px at 90% 10%, rgba(255,255,255,0.6), transparent)
              `,
              backgroundSize: '350px 350px',
            }}
          />
          <div 
            className="star-layer animate-twinkle-medium"
            style={{
              ...fullScreen,
              opacity: opacity * 0.8,
              animation: reducedMotion ? 'none' : undefined,
              backgroundImage: `
                radial-gradient(1.5px 1.5px at 50% 70%, rgba(255,255,255,0.9), transparent),
                radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,0.7), transparent),
                radial-gradient(1.5px 1.5px at 60% 10%, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 15% 85%, rgba(255,255,255,0.7), transparent)
              `,
              backgroundSize: '450px 450px',
            }}
          />
          <div 
            className="star-layer animate-twinkle-fast"
            style={{
              ...fullScreen,
              opacity: opacity,
              animation: reducedMotion ? 'none' : undefined,
              backgroundImage: `
                radial-gradient(2px 2px at 20% 80%, rgba(255,255,255,0.9), transparent),
                radial-gradient(1.5px 1.5px at 40% 90%, rgba(255,255,255,0.8), transparent),
                radial-gradient(2px 2px at 80% 40%, rgba(255,255,255,0.9), transparent),
                radial-gradient(1px 1px at 5% 5%, rgba(255,255,255,0.9), transparent)
              `,
              backgroundSize: '550px 550px',
            }}
          />
        </>
      )}
      
      {showGrid && (
        <div 
          style={{
            ...fullScreen,
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            opacity: opacity * 0.5,
          }}
        />
      )}
      
      {showScanlines && (
        <div 
          className="crt-scanlines"
          style={{
            ...fullScreen,
            opacity: opacity * 0.8,
          }}
        />
      )}
    </div>
  );
};
