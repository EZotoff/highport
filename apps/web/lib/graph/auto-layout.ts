import { Edge, Node } from '@xyflow/react';

export type LayoutAlgorithm = 'grid' | 'circular' | 'hierarchical';

export interface LayoutResult {
  [nodeId: string]: { x: number; y: number };
}

export function gridLayout(nodes: Node[], _edges: Edge[], spacing = 250): LayoutResult {
  if (nodes.length === 0) {
    return {};
  }

  const cols = Math.ceil(Math.sqrt(nodes.length));
  const result: LayoutResult = {};

  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    result[node.id] = { x: col * spacing, y: row * spacing };
  });

  return result;
}

export function circularLayout(nodes: Node[], _edges: Edge[]): LayoutResult {
  if (nodes.length === 0) {
    return {};
  }

  if (nodes.length === 1) {
    return { [nodes[0].id]: { x: 0, y: 0 } };
  }

  const result: LayoutResult = {};
  const radius = Math.max(200, nodes.length * 40);
  const angleStep = (2 * Math.PI) / nodes.length;

  nodes.forEach((node, index) => {
    result[node.id] = {
      x: radius * Math.cos(index * angleStep),
      y: radius * Math.sin(index * angleStep),
    };
  });

  return result;
}

export function hierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  spacing = { x: 250, y: 150 },
): LayoutResult {
  if (nodes.length === 0) {
    return {};
  }

  if (nodes.length === 1) {
    return { [nodes[0].id]: { x: 0, y: 0 } };
  }

  const result: LayoutResult = {};
  const nodeIds = new Set(nodes.map((node) => node.id));

  const children = new Map<string, Set<string>>();
  const incomingCount = new Map<string, number>();
  const undirected = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    children.set(node.id, new Set());
    incomingCount.set(node.id, 0);
    undirected.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return;
    }

    children.get(edge.source)?.add(edge.target);
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);

    undirected.get(edge.source)?.add(edge.target);
    undirected.get(edge.target)?.add(edge.source);
  });

  const visitedForComponents = new Set<string>();
  const components: string[][] = [];

  for (const node of nodes) {
    if (visitedForComponents.has(node.id)) {
      continue;
    }

    const queue = [node.id];
    const component: string[] = [];
    visitedForComponents.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      component.push(current);

      undirected.get(current)?.forEach((neighbor) => {
        if (visitedForComponents.has(neighbor)) {
          return;
        }
        visitedForComponents.add(neighbor);
        queue.push(neighbor);
      });
    }

    components.push(component);
  }

  let componentOffsetX = 0;

  components.forEach((component) => {
    const componentSet = new Set(component);
    const layers = new Map<string, number>();
    const queue: Array<{ nodeId: string; layer: number }> = [];

    const roots = component.filter((nodeId) => (incomingCount.get(nodeId) ?? 0) === 0);
    const startNodes = roots.length > 0 ? roots : [component[0]];

    startNodes.forEach((nodeId) => {
      queue.push({ nodeId, layer: 0 });
    });

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      const existingLayer = layers.get(current.nodeId);
      if (existingLayer !== undefined && existingLayer <= current.layer) {
        continue;
      }
      layers.set(current.nodeId, current.layer);

      children.get(current.nodeId)?.forEach((childId) => {
        if (!componentSet.has(childId)) {
          return;
        }
        const nextLayer = current.layer + 1;
        const childLayer = layers.get(childId);
        if (childLayer === undefined || nextLayer < childLayer) {
          queue.push({ nodeId: childId, layer: nextLayer });
        }
      });
    }

    let maxLayer = Math.max(0, ...Array.from(layers.values()));
    component.forEach((nodeId) => {
      if (layers.has(nodeId)) {
        return;
      }
      maxLayer += 1;
      layers.set(nodeId, maxLayer);
    });

    const layerBuckets = new Map<number, string[]>();
    component.forEach((nodeId) => {
      const layer = layers.get(nodeId) ?? 0;
      const bucket = layerBuckets.get(layer) ?? [];
      bucket.push(nodeId);
      layerBuckets.set(layer, bucket);
    });

    const sortedLayers = Array.from(layerBuckets.keys()).sort((a, b) => a - b);
    sortedLayers.forEach((layer) => {
      const bucket = (layerBuckets.get(layer) ?? []).sort((a, b) => a.localeCompare(b));
      const rowWidth = (bucket.length - 1) * spacing.x;

      bucket.forEach((nodeId, index) => {
        result[nodeId] = {
          x: componentOffsetX + index * spacing.x - rowWidth / 2,
          y: layer * spacing.y,
        };
      });
    });

    const widestLayerCount = Math.max(
      1,
      ...Array.from(layerBuckets.values()).map((bucket) => bucket.length),
    );
    componentOffsetX += widestLayerCount * spacing.x + spacing.x * 1.5;
  });

  return result;
}

export function applyLayout(
  algorithm: LayoutAlgorithm,
  nodes: Node[],
  edges: Edge[],
): LayoutResult {
  switch (algorithm) {
    case 'grid':
      return gridLayout(nodes, edges);
    case 'circular':
      return circularLayout(nodes, edges);
    case 'hierarchical':
      return hierarchicalLayout(nodes, edges);
    default:
      return gridLayout(nodes, edges);
  }
}
