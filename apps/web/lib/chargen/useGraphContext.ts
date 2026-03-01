'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode, NodeType } from '@highport/shared/types/graph';
import { getEdgesMap, getNodesMap, getYDoc } from '../ydoc';
import { yMapToEdge, yMapToNode } from '../yjs-helpers';

export interface GraphEntitySummary {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  tags?: string[];
  connections: Array<{ targetId: string; targetName?: string; relationship: string }>;
}

function buildEntitySummaries(nodes: GraphNode[], edges: GraphEdge[]): GraphEntitySummary[] {
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const visibleNodeById = new Map(visibleNodes.map((node) => [node.id, node]));
  const visibleEdges = edges.filter(
    (edge) =>
      !edge.hidden && visibleNodeById.has(edge.source_id) && visibleNodeById.has(edge.target_id),
  );

  return visibleNodes.map((node) => {
    const connections: GraphEntitySummary['connections'] = [];

    visibleEdges.forEach((edge) => {
      if (edge.source_id === node.id) {
        connections.push({
          targetId: edge.target_id,
          targetName: visibleNodeById.get(edge.target_id)?.label,
          relationship: edge.relation_label || edge.type,
        });
      }

      if (edge.target_id === node.id) {
        connections.push({
          targetId: edge.source_id,
          targetName: visibleNodeById.get(edge.source_id)?.label,
          relationship: edge.relation_label || edge.type,
        });
      }
    });

    return {
      id: node.id,
      name: node.label,
      type: node.type,
      description: node.metadata.description,
      tags: node.metadata.tags,
      connections,
    };
  });
}

export function useGraphContext(): {
  entities: GraphEntitySummary[];
  isLoading: boolean;
  refresh: () => void;
} {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const doc = getYDoc();
    const nodesMap = getNodesMap(doc);
    const edgesMap = getEdgesMap(doc);

    const loadGraph = () => {
      const nextNodes: GraphNode[] = [];
      const nextEdges: GraphEdge[] = [];

      nodesMap.forEach((yMap) => {
        nextNodes.push(yMapToNode(yMap));
      });

      edgesMap.forEach((yMap) => {
        nextEdges.push(yMapToEdge(yMap));
      });

      setNodes(nextNodes);
      setEdges(nextEdges);
      setIsLoading(false);
    };

    refreshRef.current = loadGraph;

    loadGraph();
    nodesMap.observe(loadGraph);
    edgesMap.observe(loadGraph);

    return () => {
      refreshRef.current = null;
      nodesMap.unobserve(loadGraph);
      edgesMap.unobserve(loadGraph);
    };
  }, []);

  const entities = useMemo(() => buildEntitySummaries(nodes, edges), [nodes, edges]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    refreshRef.current?.();
  }, []);

  return { entities, isLoading, refresh };
}
