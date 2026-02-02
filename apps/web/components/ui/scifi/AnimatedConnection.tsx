import React from 'react';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { useReducedMotion } from '@/lib/design-system/animationUtils';

interface AnimatedConnectionProps {
    path: string;
    color?: string;
    strokeWidth?: number;
    animated?: boolean;
    dashed?: boolean;
    glowIntensity?: 'low' | 'medium' | 'high';
    className?: string;
}

export const AnimatedConnection: React.FC<AnimatedConnectionProps> = ({ 
    path, 
    color = 'cyan', 
    strokeWidth = 2,
    animated = false,
    dashed = false,
    glowIntensity = 'medium',
    className = "" 
}) => {
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && !prefersReducedMotion;
    
    const resolvedColor = (color in THEME_HEX) ? THEME_HEX[color as keyof typeof THEME_HEX] : color;

    const glowBlur = {
        low: 'blur-[2px]',
        medium: 'blur-[4px]',
        high: 'blur-[8px]'
    }[glowIntensity];

    const glowOpacity = {
        low: 'opacity-30',
        medium: 'opacity-50',
        high: 'opacity-80'
    }[glowIntensity];

    return (
        <g className={`connection-group pointer-events-none ${className}`}>
            <path 
                d={path} 
                stroke={resolvedColor} 
                strokeWidth={strokeWidth * 3} 
                fill="none" 
                className={`${glowBlur} ${glowOpacity}`} 
                style={{ strokeLinecap: 'round' }}
            />
            
            <path 
                d={path} 
                stroke={resolvedColor} 
                strokeWidth={strokeWidth} 
                fill="none"
                className="opacity-90" 
            />
            
            {(dashed || shouldAnimate) && (
                <path 
                    d={path} 
                    stroke="white" 
                    strokeWidth={strokeWidth} 
                    fill="none" 
                    strokeDasharray={dashed ? "4 6" : "10 10"} 
                    className={shouldAnimate ? "animate-[dash_1s_linear_infinite] opacity-60" : "opacity-30"}
                    style={{ strokeLinecap: 'round' }}
                />
            )}

            {shouldAnimate && glowIntensity === 'high' && (
                 <circle r={strokeWidth * 1.5} fill="white" className="animate-[trace_2s_linear_infinite]">
                    <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                 </circle>
            )}

            <style jsx global>{`
                @keyframes dash {
                    to {
                        stroke-dashoffset: -20;
                    }
                }
                @keyframes trace {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </g>
    );
};
