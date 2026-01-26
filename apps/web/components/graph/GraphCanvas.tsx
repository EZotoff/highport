'use client';

import React, { useCallback, useEffect } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as Y from 'yjs';
import { getYDoc, getNodesMap, getEdgesMap } from '../../lib/ydoc';
import { addNode, updateNodePosition, deleteNode, yMapToNode, yMapToEdge } from '../../lib/yjs-helpers';
import { initPersistence, initProvider, getProvider } from '../../lib/sync';
import { initAwareness, updateCursor, updateSelection, PresenceState } from '../../lib/awareness';
import { CursorOverlay, UserList, SelectionHalos } from './Presence';
import { generateNodeId } from '@planeshift/shared/utils/id';
import { GraphNode } from '@planeshift/shared/types/graph';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

function GraphCanvasContent() {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [remoteUsers, setRemoteUsers] = React.useState<PresenceState[]>([]);
  const [currentUser, setCurrentUser] = React.useState<PresenceState | null>(null);

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
        loadedNodes.push({
          id: node.id,
          type: 'custom',
          position: node.position,
          data: { label: node.label, description: node.metadata.description, ...node.metadata },
        });
      });

      const loadedEdges: Edge[] = [];
      edgesMap.forEach((yMap: any) => {
        const edge = yMapToEdge(yMap);
        loadedEdges.push({
          id: edge.id,
          source: edge.source_id,
          target: edge.target_id,
          type: edge.type === 'bi-directional' ? 'default' : 'straight',
          data: { label: edge.relation_label },
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
  }, [setNodes, setEdges]);

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
    const newNode: GraphNode = {
      id,
      type: 'custom:generic',
      label: `Node ${id.slice(-4)}`,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      metadata: { description: 'New node' },
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: 'local-user',
    };

    addNode(doc, newNode);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }} onMouseMove={onMouseMove}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
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
            <button
              onClick={handleAddNode}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-md font-medium text-sm transition-colors"
            >
              Add Node
            </button>
          </div>
        </Panel>
      </ReactFlow>
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
