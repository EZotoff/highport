import React, { memo } from 'react';
import { NodeProps, useReactFlow, Node } from '@xyflow/react';
import { ChevronDown, ChevronRight, Briefcase } from 'lucide-react';
import { CareerClusterData } from '../../lib/graph/lifepath-layout';

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
            }
          };
        }
        return node;
      })
    );
  };

  return (
    <div 
      className="relative w-full h-full rounded-xl border-2 border-slate-700/50 bg-slate-900/50 backdrop-blur-sm transition-all overflow-hidden"
      style={{ minWidth: 200, minHeight: collapsed ? 60 : 100 }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-900/50 text-blue-400">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 leading-none">
              {careerName}
            </h3>
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              {assignment}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
            {termCount} TERMS
          </span>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="absolute inset-0 top-[60px] -z-10 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
      )}
    </div>
  );
});

CareerNode.displayName = 'CareerNode';

export default CareerNode;
