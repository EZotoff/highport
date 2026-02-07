'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  OnSelectionChangeParams,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as Y from 'yjs';
import { getYDoc, getNodesMap, getEdgesMap } from '../../lib/ydoc';
import { 
  addNode, 
  updateNodePosition, 
  deleteNode, 
  yMapToNode, 
  yMapToEdge,
  updateNodeLock,
  updateNodeVisibility 
} from '../../lib/yjs-helpers';
import { getSessionId, initPersistence, initProvider, getProvider } from '../../lib/sync';
import { initAwareness, updateCursor, updateSelection, PresenceState } from '../../lib/awareness';
import { CursorOverlay, UserList, SelectionHalos } from './Presence';
import { generateNodeId, GraphNode, NodeType, MockUser } from '@planeshift/shared';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { ContextMenu } from './ContextMenu';
import { NodePanel } from './NodePanel';
import { initUndoManager, undo, redo } from '../../lib/undo';
import { getOrCreateUser } from '../../lib/identity';
import { CosmicBackground } from '@/components/ui/scifi';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

function GraphCanvasContent() {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const searchParams = useSearchParams();
  const [remoteUsers, setRemoteUsers] = React.useState<PresenceState[]>([]);
  const [currentUser, setCurrentUser] = React.useState<PresenceState | null>(null);
  const [user, setUser] = useState<MockUser | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const heavyGraph = nodes.length > 200;
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const isGM = user?.isGM || false;

  // Handle URL focus param
  useEffect(() => {
    const focusNodeId = searchParams.get('focusNode');
    if (focusNodeId && nodes.length > 0) {
      const node = nodes.find((n) => n.id === focusNodeId);
      if (node) {
        setCenter(node.position.x, node.position.y, { zoom: 1.5, duration: 800 });
        setSelectedNodeId(focusNodeId);
      }
    }
  }, [searchParams, nodes, setCenter]);

  useEffect(() => {
    setUser(getOrCreateUser());
  }, []);

  useEffect(() => {
    initUndoManager();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const doc = getYDoc();
    const sessionId = getSessionId('graph');
    initPersistence(doc, `planeshift-graph-${sessionId}`);
    const provider = initProvider(doc, sessionId);
    if (!provider.awareness) return;

    const userId = user?.userId || Math.random().toString(36).substring(7);
    const userName = user?.name || `User ${userId.slice(0, 4)}`;
    
    initAwareness(provider.awareness, userId, userName);

    const updateAwarenessState = () => {
      if (!provider.awareness) return;
      const states = provider.awareness.getStates();
      const users: PresenceState[] = [];
      states.forEach((state: any, clientId: number) => {
        if (state.userId) {
           users.push(state as PresenceState);
        }
      });
      setRemoteUsers(users.filter(u => u.userId !== userId));
      const me = users.find(u => u.userId === userId);
      if (me) setCurrentUser(me);
    };

    provider.awareness.on('change', updateAwarenessState);
    updateAwarenessState();

    return () => {
      provider.awareness?.off('change', updateAwarenessState);
    };
  }, [user]);

  useEffect(() => {
    const doc = getYDoc();
    const nodesMap = getNodesMap(doc);
    const edgesMap = getEdgesMap(doc);

    const updateGraph = () => {
      const loadedNodes: Node[] = [];
      nodesMap.forEach((yMap: any) => {
        const node = yMapToNode(yMap);
        
        if (node.hidden && !isGM) return;

        loadedNodes.push({
          id: node.id,
          type: node.type || 'custom', 
          position: node.position,
          data: { 
            label: node.label, 
            description: node.metadata.description, 
            type: node.type,
            locked: node.locked,
            hidden: node.hidden,
            ...node.metadata 
          },
          draggable: !node.locked || isGM,
        });
      });

      const loadedEdges: Edge[] = [];
      edgesMap.forEach((yMap: any) => {
        const edge = yMapToEdge(yMap);
        
        if (edge.hidden && !isGM) return;

        const strokeWidth = Math.max(1, Math.min(5, edge.weight || 1));
        
        loadedEdges.push({
          id: edge.id,
          source: edge.source_id,
          target: edge.target_id,
          type: edge.type === 'bi-directional' ? 'default' : 'straight',
          data: { label: edge.relation_label },
          style: { 
            strokeWidth,
            stroke: edge.color || '#b1b1b7',
            strokeDasharray: edge.style === 'dashed' ? '5,5' : edge.style === 'dotted' ? '2,2' : undefined,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.color || '#b1b1b7',
          },
        });
      });

      setNodes(loadedNodes);
      setEdges(loadedEdges);
    };

    updateGraph();

    const observer = () => {
      requestAnimationFrame(updateGraph);
    };

    nodesMap.observeDeep(observer);
    edgesMap.observeDeep(observer);

    return () => {
      nodesMap.unobserveDeep(observer);
      edgesMap.unobserveDeep(observer);
    };
  }, [setNodes, setEdges, isGM]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const doc = getYDoc();
      
      setNodes((nds) => applyNodeChanges(changes, nds));

      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(doc, change.id, change.position);
        } else if (change.type === 'remove') {
          deleteNode(doc, change.id);
        }
      });
    },
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    const provider = getProvider();
    if (provider && provider.awareness) {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      updateCursor(provider.awareness, position);
    }
  }, [screenToFlowPosition]);

  const onSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    const provider = getProvider();
    if (provider && provider.awareness) {
      const selectedId = nodes.length > 0 ? nodes[0].id : null;
      updateSelection(provider.awareness, selectedId);
      setSelectedNodeId(selectedId);
    }
  }, []);

  const handleAddNode = useCallback(() => {
    const doc = getYDoc();
    const id = generateNodeId();
    const types: NodeType[] = ['traveller', 'npc', 'spacecraft', 'world', 'faction', 'location', 'event', 'clue', 'sector'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const newNode: GraphNode = {
      id,
      type: randomType,
      label: `New ${randomType.charAt(0).toUpperCase() + randomType.slice(1)}`,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      metadata: { description: 'New node' },
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: user?.userId || 'anonymous',
    };

    addNode(doc, newNode);
  }, [user]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback((action: 'edit' | 'delete' | 'lock' | 'unlock' | 'hide' | 'unhide') => {
    if (!contextMenu) return;
    const doc = getYDoc();
    const nodesMap = getNodesMap(doc);
    const yNode = nodesMap.get(contextMenu.nodeId);
    if (!yNode) return;
    const node = yMapToNode(yNode);
    
    if (action === 'delete') {
      deleteNode(doc, contextMenu.nodeId);
      setNodes((current) => current.filter((node) => node.id !== contextMenu.nodeId));
      setEdges((current) =>
        current.filter(
          (edge) => edge.source !== contextMenu.nodeId && edge.target !== contextMenu.nodeId
        )
      );
    } else if (action === 'lock' || action === 'unlock') {
      updateNodeLock(doc, contextMenu.nodeId, action === 'lock');
    } else if (action === 'hide' || action === 'unhide') {
      updateNodeVisibility(doc, contextMenu.nodeId, action === 'hide');
    } else if (action === 'edit') {
      alert(`Edit node: ${node.label}`);
    }
    
    closeContextMenu();
  }, [contextMenu, closeContextMenu, setEdges, setNodes]);

  const getContextNode = (): GraphNode | null => {
    if (!contextMenu) return null;
    const doc = getYDoc();
    const nodesMap = getNodesMap(doc);
    const yNode = nodesMap.get(contextMenu.nodeId);
    return yNode ? yMapToNode(yNode) : null;
  };
  
  const contextNode = getContextNode();

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh',
        background: 'var(--deep-void)'
      }} 
      onMouseMove={onMouseMove}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onlyRenderVisibleElements={true}
        minZoom={0.1}
        maxZoom={5}
      >
        <CosmicBackground showStars={!heavyGraph} showGrid={!heavyGraph} intensity={heavyGraph ? 'low' : 'medium'} />
        {/* Vignette overlay */}
        <div 
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(10, 13, 20, 0.7) 100%)'
          }}
        />
        <Controls />
        <CursorOverlay cursors={remoteUsers} />
        <SelectionHalos users={remoteUsers} />
        <Panel position="top-right" className="pointer-events-auto" style={{ zIndex: 20 }}>
          <div className="flex gap-4 items-center relative z-10 pointer-events-auto">
            <UserList users={[...(currentUser ? [currentUser] : []), ...remoteUsers]} currentUserId={currentUser?.userId || ''} />
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleAddNode}
                className="px-4 py-2 rounded font-medium text-sm transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)] hover:border-cyan-400"
                style={{
                  background: `${THEME_HEX.cyan}20`,
                  border: `1px solid ${THEME_HEX.cyan}50`,
                  color: THEME_HEX.cyan
                }}
              >
                Add Node
              </button>
              {isGM && <span className="text-xs font-bold text-amber-500 bg-black/80 px-2 py-1 rounded">GM MODE</span>}
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      <NodePanel nodeId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
      
      {contextMenu && contextNode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          onClose={closeContextMenu}
          onAction={handleContextAction}
          isGM={isGM}
        />
      )}
    </div>
  );
}

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasContent />
    </ReactFlowProvider>
  );
}
