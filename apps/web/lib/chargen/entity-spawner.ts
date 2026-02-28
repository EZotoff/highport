import * as Y from 'yjs';
import { getYDoc } from '../ydoc';
import { addNode, addEdge } from '../yjs-helpers';
import { addEntityToPool } from './state';
import type { GraphNode, GraphEdge, NodeType } from '@highport/shared/types/graph';
import type { SpawnedEntityRef } from './types';
import type { EventSpawn } from '@highport/mgt2e';

export interface SpawnEntityInput {
  spawn: EventSpawn;
  name: string;
  description?: string;
  characterId: string;
  termNumber: number;
  eventRoll: number;
}

export function spawnEntity(input: SpawnEntityInput): SpawnedEntityRef {
  const doc = getYDoc();
  const nodeId = crypto.randomUUID();
  
  const nodeType = mapSpawnTypeToNodeType(input.spawn.type);
  
  const node: GraphNode = {
    id: nodeId,
    type: nodeType,
    label: input.name,
    position: calculateSpawnPosition(),
    metadata: {
      description: input.description,
      relationship: input.spawn.relationship,
      createdDuringChargen: true,
      characterId: input.characterId,
      termNumber: input.termNumber,
      eventRoll: input.eventRoll,
    },
    locked: false,
    hidden: false,
    created_at: Date.now(),
    created_by: 'chargen',
  };
  
  const edge: GraphEdge = {
    id: crypto.randomUUID(),
    source_id: input.characterId,
    target_id: nodeId,
    relation_label: getRelationLabel(input.spawn.relationship),
    type: 'directional',
    weight: 1,
    style: 'solid',
    color: getRelationColor(input.spawn.relationship),
    hidden: false,
  };
  
  doc.transact(() => {
    addNode(doc, node);
    addEdge(doc, edge);
  }, 'chargen-spawn');
  
  addEntityToPool(doc, {
    type: input.spawn.type as 'npc' | 'location' | 'item' | 'secret',
    createdBy: input.characterId,
    createdFor: input.characterId,
    createdDuring: { termNumber: input.termNumber, eventRoll: input.eventRoll },
    ownedBy: input.characterId,
    name: input.name,
    description: input.description,
    metadata: { relationship: input.spawn.relationship },
    graphNodeId: nodeId,
    claimedBy: [input.characterId],
  });
  
  return {
    type: input.spawn.type,
    graphNodeId: nodeId,
    relationship: input.spawn.relationship,
    name: input.name,
    description: input.description,
  };
}

function mapSpawnTypeToNodeType(spawnType: string): NodeType {
  switch (spawnType) {
    case 'npc': return 'npc';
    case 'location': return 'location';
    case 'item': return 'clue';
    case 'secret': return 'clue';
    default: return 'npc';
  }
}

function calculateSpawnPosition(): { x: number; y: number } {
  const angle = Math.random() * 2 * Math.PI;
  const radius = 200 + Math.random() * 100;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function getRelationLabel(relationship?: string): string {
  switch (relationship) {
    case 'ally': return 'Allied with';
    case 'contact': return 'Contact of';
    case 'rival': return 'Rival of';
    case 'enemy': return 'Enemy of';
    default: return 'Connected to';
  }
}

function getRelationColor(relationship?: string): string {
  switch (relationship) {
    case 'ally': return '#22c55e';
    case 'contact': return '#3b82f6';
    case 'rival': return '#f59e0b';
    case 'enemy': return '#ef4444';
    default: return '#71717a';
  }
}
