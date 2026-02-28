import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from '@xyflow/react';

interface SharedHistoryEdgeData extends Record<string, unknown> {
  characterAName: string;
  characterBName: string;
  entityName: string;
  relationshipA: string;
  relationshipB: string;
  description?: string;
}

export default function SharedHistoryEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as SharedHistoryEdgeData | undefined;

  const edgeStyle = {
    ...style,
    stroke: '#8b5cf6',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    animation: 'dashdraw 20s linear infinite',
  };

  if (!edgeData) {
    return <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />;
  }

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="group relative z-20"
        >
          <div
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-violet-500 text-[10px] text-white shadow-md transition-transform hover:scale-125"
            onClick={() => console.log('Shared History Connection:', edgeData)}
          >
            🔗
          </div>

          <div className="absolute left-1/2 top-full mt-2 hidden w-64 -translate-x-1/2 transform flex-col rounded-md bg-slate-900/95 p-3 text-xs text-white shadow-xl backdrop-blur-sm group-hover:flex z-50 border border-violet-500/30">
            <div className="mb-2 border-b border-violet-500/20 pb-1 font-semibold text-violet-300">
              Shared History
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="font-medium text-white">{edgeData.characterAName}</span>
                <span className="text-violet-200 opacity-80">{edgeData.relationshipA}</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <span>via</span>
                <span className="rounded bg-slate-800 px-1 text-slate-300">
                  {edgeData.entityName}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-white">{edgeData.characterBName}</span>
                <span className="text-violet-200 opacity-80">{edgeData.relationshipB}</span>
              </div>
            </div>

            {edgeData.description && (
              <div className="mt-2 border-t border-slate-700/50 pt-2 text-[10px] italic text-slate-400">
                {edgeData.description}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
