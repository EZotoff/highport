'use client';
import React, { useId, useRef, useState, useLayoutEffect } from 'react';

interface SilkyChevronProps {
  color: string;
  isVisible?: boolean;
  className?: string;
  height?: number;
  duration?: number;
}

export const SilkyChevron: React.FC<SilkyChevronProps> = ({
  color,
  isVisible = true,
  className = '',
  height,
  duration = 6,
}) => {
  const id = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 60 });

  const gradId = `silky-g-${id}`;
  const maskGradId = `silky-mg-${id}`;
  const maskId = `silky-m-${id}`;
  const glowId = `silky-glow-${id}`;

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height: h } = dimensions;

  const scaleFactor = Math.min(1, Math.max(0.3, h / 60));

  const padding = Math.min(h * 0.25, 20);
  const amplitude = Math.min(h * 0.15, 8);

  const glowStrokeWidth = 8 * scaleFactor;
  const coreStrokeWidth = 1.5 * scaleFactor;
  const highlightStrokeWidth = 0.5 * scaleFactor;
  const glowBlurRadius = 6 * scaleFactor;

  const yTop = padding;
  const yTip = h - padding;

  const pathD = `M 0 ${yTop} L ${width / 2} ${yTip} L ${width} ${yTop}`;

  const grayColor = '#94a3b8';
  const stopStyle = { transition: 'stop-color 500ms ease-in-out' };

  const safeDuration = duration > 0 ? duration : 6;
  const halfDuration = safeDuration / 2;

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex items-center justify-center transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ height: height ? `${height}px` : '100%', minHeight: '20px' }}
    >
      <style>{`
                @keyframes wash-line-${id} {
                    0% { transform: translateY(-${amplitude}px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(${amplitude}px); opacity: 0; }
                }
            `}</style>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${h}`}
        className="overflow-visible w-full block pointer-events-none"
      >
        <defs>
          <linearGradient id={gradId} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={grayColor} style={stopStyle} />
            <stop offset="0.2" stopColor={grayColor} style={stopStyle} />
            <stop offset="0.4" stopColor={color} style={stopStyle} />
            <stop offset="0.6" stopColor={color} style={stopStyle} />
            <stop offset="0.8" stopColor={grayColor} style={stopStyle} />
            <stop offset="1" stopColor={grayColor} style={stopStyle} />
          </linearGradient>

          <linearGradient
            id={maskGradId}
            gradientUnits="objectBoundingBox"
            x1="0"
            y1="0"
            x2="1"
            y2="0"
          >
            <stop offset="0" stopColor="black" />
            <stop offset="0.15" stopColor="#111111" />
            <stop offset="0.35" stopColor="white" />
            <stop offset="0.65" stopColor="white" />
            <stop offset="0.85" stopColor="#111111" />
            <stop offset="1" stopColor="black" />
          </linearGradient>

          <mask id={maskId}>
            <rect
              x={-50}
              y={-50}
              width={width + 100}
              height={h + 100}
              fill={`url(#${maskGradId})`}
            />
          </mask>

          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={glowBlurRadius} result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g mask={`url(#${maskId})`}>
          <g style={{ animation: `wash-line-${id} ${safeDuration}s ease-in-out infinite` }}>
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={glowStrokeWidth}
              filter={`url(#${glowId})`}
              opacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={coreStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="white"
              strokeWidth={highlightStrokeWidth}
              opacity="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          <g
            style={{
              animation: `wash-line-${id} ${safeDuration}s ease-in-out infinite`,
              animationDelay: `-${halfDuration}s`,
            }}
          >
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={glowStrokeWidth}
              filter={`url(#${glowId})`}
              opacity="0.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={coreStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="white"
              strokeWidth={highlightStrokeWidth}
              opacity="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
