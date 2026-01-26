'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
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
  Connection,
  addEdge as addReactFlowEdge,
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
import { initPersistence, initProvider, getProvider } from '../../lib/sync';
import { initAwareness, updateCursor, updateSelection, PresenceState } from '../../lib/awareness';
import { CursorOverlay, UserList, SelectionHalos } from './Presence';
import { generateNodeId } from '@planeshift/shared/utils/id';
import { GraphNode, NodeType } from '@planeshift/shared/types/graph';
import { nodeTypes } from './nodes';
import { ContextMenu } from './ContextMenu';
import { initUndoManager, undo, redo } from '../../lib/undo';

function GraphCanvasContent() {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [remoteUsers, setRemoteUsers] = React.useState<PresenceState[]>([]);
  const [currentUser, setCurrentUser] = React.useState<PresenceState | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [isGM, setIsGM] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gm') === 'true') {
      localStorage.setItem('planeshift_gm', 'true');
    }
    setIsGM(localStorage.getItem('planeshift_gm') === 'true');
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
    initPersistence(doc);
    const provider = initProvider(doc);
    if (!provider.awareness) return;

    const userId = Math.random().toString(36).substring(7);
    initAwareness(provider.awareness, userId, `User ${userId.slice(0, 4)}`);

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
  }, []);

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
      created_by: 'local-user',
    };

    addNode(doc, newNode);
  }, []);

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

  const handleContextAction = useCallback((action: 'edit' | 'delete' | 'lock' | 'hide') => {
    if (!contextMenu) return;
    const doc = getYDoc();
    const node = nodes.find(n => n.id === contextMenu.nodeId);
    
    if (action === 'delete') {
      deleteNode(doc, contextMenu.nodeId);
    } else if (action === 'lock') {
      updateNodeLock(doc, contextMenu.nodeId, !node?.data.locked);
    } else if (action === 'hide') {
      updateNodeVisibility(doc, contextMenu.nodeId, !node?.data.hidden);
    } else if (action === 'edit') {
      alert('Edit feature coming soon!');
    }
    
    closeContextMenu();
  }, [contextMenu, nodes, closeContextMenu]);

  const contextNode = nodes.find(n => n.id === contextMenu?.nodeId);

  return (
    <div style={{ width: '100vw', height: '100vh' }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        onlyRenderVisibleElements={true}
        minZoom={0.1}
        maxZoom={5}
      >
        <Background />
        <Controls />
        <CursorOverlay cursors={remoteUsers} />
        <SelectionHalos users={remoteUsers} />
        <Panel position="top-right">
          <div className="flex gap-4 items-center">
            <UserList users={[...(currentUser ? [currentUser] : []), ...remoteUsers]} currentUserId={currentUser?.userId || ''} />
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={handleAddNode}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md font-medium text-sm transition-colors"
              >
                Add Node
              </button>
              {isGM && <span className="text-xs font-bold text-amber-500 bg-black/80 px-2 py-1 rounded">GM MODE</span>}
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onEdit={() => handleContextAction('edit')}
          onDelete={() => handleContextAction('delete')}
          onLock={() => handleContextAction('lock')}
          onHide={() => handleContextAction('hide')}
          isLocked={!!contextNode?.data.locked}
          isHidden={!!contextNode?.data.hidden}
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
