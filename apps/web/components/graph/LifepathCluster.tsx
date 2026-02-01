import React, { useEffect } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  NodeProps, 
  Handle, 
  Position, 
  useNodesState, 
  useEdgesState, 
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ChargenCharacter } from '../../lib/chargen/types';
import { calculateLifepathLayout, TermNodeData } from '../../lib/graph/lifepath-layout';
import CareerNode from './CareerNode';
import { Shield, Skull, Award, User } from 'lucide-react';

interface LifepathClusterProps {
  character: ChargenCharacter;
}

const TermNode = ({ data }: NodeProps<Node<TermNodeData>>) => {
  const { termNumber, age, eventSummary, survived, advanced, rankGained } = data;
  
  const statusColor = !survived 
    ? 'border-red-500/50 bg-red-900/20' 
    : advanced 
      ? 'border-amber-500/50 bg-amber-900/20' 
      : 'border-emerald-500/50 bg-emerald-900/20';

  return (
    <div className={`relative w-[180px] p-3 rounded-lg border backdrop-blur-sm ${statusColor} group hover:scale-105 transition-transform`}>
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />
      
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono text-slate-400">TERM {termNumber}</span>
        <span className="text-[10px] font-mono text-slate-400">AGE {age}</span>
      </div>
      
      <div className="text-xs font-medium text-slate-200 line-clamp-3 mb-2 min-h-[40px]">
        {eventSummary}
      </div>

      <div className="flex gap-2 border-t border-slate-700/50 pt-2">
        {!survived && (
          <div className="flex items-center gap-1 text-red-400" title="Mishap">
            <Skull className="w-3 h-3" />
          </div>
        )}
        {survived && (
          <div className="flex items-center gap-1 text-emerald-400" title="Survived">
            <Shield className="w-3 h-3" />
          </div>
        )}
        {advanced && (
          <div className="flex items-center gap-1 text-amber-400" title="Advanced">
            <Award className="w-3 h-3" />
            {rankGained !== undefined && <span className="text-[10px]">RANK {rankGained}</span>}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="spawn-source"
        className="!bg-purple-500 !w-2 !h-2 left-1/2 -translate-x-1/2 top-auto bottom-[-5px]" 
      />
    </div>
  );
};

const CharacterNode = ({ data }: NodeProps) => (
  <div className="flex flex-col items-center justify-center w-32 h-32 rounded-full border-4 border-blue-500 bg-slate-900 text-slate-200 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
    <User className="w-10 h-10 mb-2 text-blue-400" />
    <div className="text-sm font-bold text-center px-2 leading-tight">{data.label as string}</div>
    <div className="text-xs text-blue-400 mt-1">{data.subLabel as string}</div>
    <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
  </div>
);

const nodeTypes = {
  'career-cluster': CareerNode,
  'term': TermNode,
  'character': CharacterNode,
};

export default function LifepathCluster({ character }: LifepathClusterProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!character) return;

    const center = { x: 0, y: 0 };
    const layout = calculateLifepathLayout({
      character,
      characterNodePosition: center,
    });

    const characterNode: Node = {
      id: 'character-root',
      type: 'character',
      position: center,
      data: { 
        label: character.name,
        subLabel: `${character.age} y/o`
      },
    };

    setNodes([...layout.nodes, characterNode]);
    setEdges(layout.edges);
  }, [character, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls className="!bg-slate-800 !border-slate-700 !fill-slate-300 [&>button]:!border-b-slate-700" />
      </ReactFlow>
    </div>
  );
}
