import React from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface EnergyEdgeData {
  label?: string;
  color?: string;
  animated?: boolean;
}

export function EnergyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as EnergyEdgeData | undefined;
  const color = edgeData?.color || THEME_HEX.cyan;
  const animated = edgeData?.animated !== false;
  const label = edgeData?.label;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <path
        d={edgePath}
        stroke={color}
        strokeWidth={6}
        fill="none"
        filter="blur(4px)"
        opacity={0.3}
        className="react-flow__edge-path"
      />

      <path
        d={edgePath}
        stroke={color}
        strokeWidth={2}
        fill="none"
        className="react-flow__edge-path"
        style={{
          opacity: selected ? 1 : 0.8,
        }}
      />

      {animated && (
        <path
          d={edgePath}
          stroke="white"
          strokeWidth={2}
          fill="none"
          strokeDasharray="6 10"
          className="animate-[dash_1s_linear_infinite]"
          style={{
            opacity: 0.5,
          }}
        />
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="px-2 py-1 rounded text-xs font-mono"
              style={{
                backgroundColor: '#1a1f2e',
                border: `1px solid ${color}30`,
                color: color,
                boxShadow: `0 0 8px ${color}20`,
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
