import React, { memo } from 'react';
import { NodeProps, useReactFlow, Node } from '@xyflow/react';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { CareerClusterData } from '../../lib/graph/lifepath-layout';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

type CareerClusterNode = Node<CareerClusterData, 'career-cluster'>;

const CareerNode = memo(({ id, data }: NodeProps<CareerClusterNode>) => {
  const { setNodes } = useReactFlow();
  const { careerName, assignment, termCount, collapsed } = data;

  const onToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          const typedNode = node as CareerClusterNode;
          const isCollapsed = !typedNode.data.collapsed;
          return {
            ...node,
            data: { ...node.data, collapsed: isCollapsed },
            style: {
              ...node.style,
              height: isCollapsed ? 60 : undefined,
            },
          };
        }
        return node;
      }),
    );
  };

  return (
    <div
      className="relative w-full h-full rounded-2xl overflow-hidden transition-all group"
      style={{
        minWidth: 200,
        minHeight: collapsed ? 60 : 100,
        background: 'linear-gradient(135deg, var(--star-metal-50) 0%, var(--nebula-mist-30) 100%)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `1px solid ${THEME_HEX.violet}30`,
        boxShadow: `0 0 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: `linear-gradient(90deg, ${THEME_HEX.violet}15 0%, transparent 100%)`,
          borderBottom: `1px solid ${THEME_HEX.violet}20`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              backgroundColor: `${THEME_HEX.violet}20`,
              color: THEME_HEX.violet,
              boxShadow: `0 0 10px ${THEME_HEX.violet}20`,
            }}
          >
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none" style={{ color: '#e2e8f0' }}>
              {careerName}
            </h3>
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: `${THEME_HEX.violet}cc` }}
            >
              {assignment}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--nebula-mist-80)',
              color: '#94a3b8',
              border: '1px solid var(--asteroid-dust-50)',
            }}
          >
            {termCount} TERMS
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded transition-all"
            style={{
              color: '#94a3b8',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${THEME_HEX.violet}20`;
              e.currentTarget.style.color = THEME_HEX.violet;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div
          className="absolute inset-0 top-[60px] -z-10 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 116, 139, 0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 116, 139, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            opacity: 0.5,
          }}
        />
      )}

      <div
        className="absolute top-0 left-0 w-3 h-3 pointer-events-none"
        style={{
          borderLeft: `2px solid ${THEME_HEX.violet}40`,
          borderTop: `2px solid ${THEME_HEX.violet}40`,
        }}
      />
      <div
        className="absolute top-0 right-0 w-3 h-3 pointer-events-none"
        style={{
          borderRight: `2px solid ${THEME_HEX.violet}40`,
          borderTop: `2px solid ${THEME_HEX.violet}40`,
        }}
      />
    </div>
  );
});

CareerNode.displayName = 'CareerNode';

export default CareerNode;
