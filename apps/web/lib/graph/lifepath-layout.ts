import { Node, Edge, MarkerType } from '@xyflow/react';
import { ChargenCharacter, CareerTermResult } from '../chargen/types';

export interface LifepathLayoutInput {
  character: ChargenCharacter;
  characterNodePosition: { x: number; y: number };
}

export interface LifepathLayoutOutput {
  nodes: LifepathNode[];
  edges: LifepathEdge[];
}

export type LifepathNode = Node<CareerClusterData | TermNodeData, 'career-cluster' | 'term'>;

export interface CareerClusterData extends Record<string, unknown> {
  careerId: string;
  careerName: string;
  termCount: number;
  assignment: string;
  collapsed: boolean;
}

export interface TermNodeData extends Record<string, unknown> {
  termNumber: number;
  age: number;
  eventSummary: string;
  survived: boolean;
  advanced: boolean;
  rankGained?: number;
  spawnedEntityIds: string[];
}

export interface LifepathEdge extends Edge {
  type?: 'term-sequence' | 'spawned-entity' | 'smoothstep' | 'default';
}

const CLUSTER_WIDTH_PER_TERM = 200;
const CLUSTER_PADDING = 40;
const TERM_WIDTH = 180;
const TERM_HEIGHT = 120;
const TERM_GAP = 20;

export function calculateLifepathLayout({
  character,
  characterNodePosition,
}: LifepathLayoutInput): LifepathLayoutOutput {
  const nodes: LifepathNode[] = [];
  const edges: LifepathEdge[] = [];

  const careerGroups: { [key: string]: CareerTermResult[] } = {};

  character.terms.forEach((term) => {
    const key = `${term.careerId}-${term.assignmentId}`;
    if (!careerGroups[key]) {
      careerGroups[key] = [];
    }
    careerGroups[key].push(term);
  });

  const clusters = Object.values(careerGroups);
  const totalClustersWidth = clusters.reduce((acc, terms) => {
    return acc + terms.length * (TERM_WIDTH + TERM_GAP) + CLUSTER_PADDING * 2 + 50;
  }, 0);

  let currentX = characterNodePosition.x - totalClustersWidth / 2;
  const clusterY = characterNodePosition.y - 400;

  clusters.forEach((terms, index) => {
    const firstTerm = terms[0];
    const clusterId = `cluster-${index}`;
    const clusterWidth = terms.length * (TERM_WIDTH + TERM_GAP) + CLUSTER_PADDING * 2;
    const clusterHeight = TERM_HEIGHT + CLUSTER_PADDING * 2 + 40;

    nodes.push({
      id: clusterId,
      type: 'career-cluster',
      position: { x: currentX, y: clusterY },
      data: {
        careerId: firstTerm.careerId,
        careerName: firstTerm.careerId,
        termCount: terms.length,
        assignment: firstTerm.assignmentId,
        collapsed: false,
      },
      style: { width: clusterWidth, height: clusterHeight },
    });

    terms.forEach((term, termIndex) => {
      const termNodeId = `term-${term.termNumber}`;

      nodes.push({
        id: termNodeId,
        type: 'term',
        position: {
          x: CLUSTER_PADDING + termIndex * (TERM_WIDTH + TERM_GAP),
          y: CLUSTER_PADDING + 40,
        },
        data: {
          termNumber: term.termNumber,
          age: term.startAge + 4,
          eventSummary: term.eventDescription || term.eventChoice || 'No event',
          survived: term.survived,
          advanced: term.advanced,
          rankGained: term.rankGained,
          spawnedEntityIds: term.spawnedEntities?.map((e) => e.graphNodeId) || [],
        },
        parentId: clusterId,
        extent: 'parent',
      });

      if (termIndex > 0) {
        edges.push({
          id: `seq-${term.termNumber}`,
          source: `term-${terms[termIndex - 1].termNumber}`,
          target: termNodeId,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#4b5563', strokeDasharray: '5 5' },
        });
      }

      if (term.spawnedEntities) {
        term.spawnedEntities.forEach((entity) => {
          edges.push({
            id: `spawn-${termNodeId}-${entity.graphNodeId}`,
            source: termNodeId,
            target: entity.graphNodeId,
            type: 'default',
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
          });
        });
      }
    });

    currentX += clusterWidth + 50;
  });

  return { nodes, edges };
}
