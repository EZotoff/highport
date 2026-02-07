import * as Y from 'yjs';
import type { GraphNode, GraphEdge, NodeType } from '@planeshift/shared/types/graph';
import { getNodesMap, getEdgesMap } from './ydoc';

export function nodeToYMap(node: GraphNode): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>();
  ymap.set('id', node.id);
  ymap.set('type', node.type);
  ymap.set('label', node.label);
  ymap.set('position', { x: node.position.x, y: node.position.y });
  ymap.set('metadata', { ...node.metadata });
  ymap.set('locked', node.locked);
  ymap.set('hidden', node.hidden);
  ymap.set('created_at', node.created_at);
  ymap.set('created_by', node.created_by);
  return ymap;
}

export function yMapToNode(ymap: Y.Map<unknown>): GraphNode {
  return {
    id: ymap.get('id') as string,
    type: ymap.get('type') as NodeType,
    label: ymap.get('label') as string,
    position: ymap.get('position') as { x: number; y: number },
    metadata: ymap.get('metadata') as GraphNode['metadata'],
    locked: ymap.get('locked') as boolean,
    hidden: ymap.get('hidden') as boolean,
    created_at: ymap.get('created_at') as number,
    created_by: ymap.get('created_by') as string,
  };
}

export function edgeToYMap(edge: GraphEdge): Y.Map<unknown> {
  const ymap = new Y.Map<unknown>();
  ymap.set('id', edge.id);
  ymap.set('source_id', edge.source_id);
  ymap.set('target_id', edge.target_id);
  ymap.set('relation_label', edge.relation_label);
  ymap.set('type', edge.type);
  ymap.set('weight', edge.weight);
  ymap.set('style', edge.style);
  ymap.set('color', edge.color);
  ymap.set('hidden', edge.hidden);
  return ymap;
}

export function yMapToEdge(ymap: Y.Map<unknown>): GraphEdge {
  return {
    id: ymap.get('id') as string,
    source_id: ymap.get('source_id') as string,
    target_id: ymap.get('target_id') as string,
    relation_label: ymap.get('relation_label') as string,
    type: ymap.get('type') as GraphEdge['type'],
    weight: ymap.get('weight') as number,
    style: ymap.get('style') as GraphEdge['style'],
    color: ymap.get('color') as string,
    hidden: ymap.get('hidden') as boolean,
  };
}

export function addNode(doc: Y.Doc, node: GraphNode): void {
  const nodes = getNodesMap(doc);
  doc.transact(() => {
    const ymap = new Y.Map<unknown>();
    nodes.set(node.id, ymap);
    ymap.set('id', node.id);
    ymap.set('type', node.type);
    ymap.set('label', node.label);
    ymap.set('position', { x: node.position.x, y: node.position.y });
    ymap.set('metadata', { ...node.metadata });
    ymap.set('locked', node.locked);
    ymap.set('hidden', node.hidden);
    ymap.set('created_at', node.created_at);
    ymap.set('created_by', node.created_by);
  });
}

export function updateNodePosition(
  doc: Y.Doc,
  nodeId: string,
  position: { x: number; y: number }
): void {
  const nodes = getNodesMap(doc);
  const ymap = nodes.get(nodeId);
  if (ymap) {
    ymap.set('position', { x: position.x, y: position.y });
  }
}

export function deleteNode(doc: Y.Doc, nodeId: string): void {
  doc.transact(() => {
    const nodes = getNodesMap(doc);
    const edges = getEdgesMap(doc);

    nodes.delete(nodeId);

    const edgesToDelete: string[] = [];
    edges.forEach((edgeYMap, edgeId) => {
      const sourceId = edgeYMap.get('source_id') as string;
      const targetId = edgeYMap.get('target_id') as string;
      if (sourceId === nodeId || targetId === nodeId) {
        edgesToDelete.push(edgeId);
      }
    });

    for (const edgeId of edgesToDelete) {
      edges.delete(edgeId);
    }
  });
}

export function addEdge(doc: Y.Doc, edge: GraphEdge): void {
  const edges = getEdgesMap(doc);
  doc.transact(() => {
    const ymap = new Y.Map<unknown>();
    edges.set(edge.id, ymap);
    ymap.set('id', edge.id);
    ymap.set('source_id', edge.source_id);
    ymap.set('target_id', edge.target_id);
    ymap.set('relation_label', edge.relation_label);
    ymap.set('type', edge.type);
    ymap.set('weight', edge.weight);
    ymap.set('style', edge.style);
    ymap.set('color', edge.color);
    ymap.set('hidden', edge.hidden);
  });
}

export function deleteEdge(doc: Y.Doc, edgeId: string): void {
  const edges = getEdgesMap(doc);
  edges.delete(edgeId);
}

export function updateNodeLock(doc: Y.Doc, nodeId: string, locked: boolean): void {
  const nodes = getNodesMap(doc);
  const ymap = nodes.get(nodeId);
  if (ymap) {
    ymap.set('locked', locked);
  }
}

export function updateNodeVisibility(doc: Y.Doc, nodeId: string, hidden: boolean): void {
  const nodes = getNodesMap(doc);
  const ymap = nodes.get(nodeId);
  if (ymap) {
    ymap.set('hidden', hidden);
  }
}

export function updateNodeMetadata(
  doc: Y.Doc,
  nodeId: string,
  metadata: Partial<GraphNode['metadata']>
): void {
  const nodes = getNodesMap(doc);
  const ymap = nodes.get(nodeId);
  if (!ymap) return;

  const currentMetadata = (ymap.get('metadata') as GraphNode['metadata']) || {};
  const updatedMetadata = { ...currentMetadata, ...metadata };

  doc.transact(() => {
    ymap.set('metadata', updatedMetadata);
  }, 'node-metadata-update');
}
