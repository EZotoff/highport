import { Edge } from '@xyflow/react';
import { ChargenCharacter, SpawnedEntityRef } from '@/lib/chargen/types';

export interface SharedHistoryConnection {
  characterA: string;
  characterB: string;
  sharedEntity: string;
  relationshipA: string;
  relationshipB: string;
  description?: string;
  characterAName: string;
  characterBName: string;
  entityName: string;
}

/**
 * Find all shared entities between characters
 * @param characters - Array of ChargenCharacter objects
 * @returns Array of SharedHistoryConnection objects
 */
export function findSharedHistory(characters: ChargenCharacter[]): SharedHistoryConnection[] {
  const entityRefs = new Map<string, Array<{ 
    charId: string; 
    charName: string; 
    ref: SpawnedEntityRef 
  }>>();

  for (const char of characters) {
    if (!char.terms) continue;
    
    for (const term of char.terms) {
      if (!term.spawnedEntities) continue;
      
      for (const entity of term.spawnedEntities) {
        if (!entity.graphNodeId) continue;
        
        if (!entityRefs.has(entity.graphNodeId)) {
          entityRefs.set(entity.graphNodeId, []);
        }
        
        entityRefs.get(entity.graphNodeId)!.push({
          charId: char.id,
          charName: char.name,
          ref: entity
        });
      }
    }
  }

  const connections: SharedHistoryConnection[] = [];

  for (const [entityId, refs] of entityRefs.entries()) {
    const charsInvolved = new Set(refs.map(r => r.charId));
    
    if (charsInvolved.size < 2) continue;

    const uniqueRefs = Array.from(charsInvolved).map(id => refs.find(r => r.charId === id)!);
    
    for (let i = 0; i < uniqueRefs.length; i++) {
      for (let j = i + 1; j < uniqueRefs.length; j++) {
        const refA = uniqueRefs[i];
        const refB = uniqueRefs[j];

        connections.push({
          characterA: refA.charId,
          characterB: refB.charId,
          sharedEntity: entityId,
          relationshipA: refA.ref.relationship || 'connected',
          relationshipB: refB.ref.relationship || 'connected',
          description: `Shared connection to ${refA.ref.name}`,
          characterAName: refA.charName,
          characterBName: refB.charName,
          entityName: refA.ref.name,
        });
      }
    }
  }

  return connections;
}

/**
 * Generate edges for shared history visualization
 * @param connections - Array of SharedHistoryConnection
 * @returns Array of React Flow Edge objects styled for shared history
 */
export function generateSharedHistoryEdges(connections: SharedHistoryConnection[]): Edge[] {
  const edges: Edge[] = [];

  for (const conn of connections) {
    const edgeAId = `shared-${conn.characterA}-${conn.sharedEntity}-with-${conn.characterB}`;
    const edgeBId = `shared-${conn.characterB}-${conn.sharedEntity}-with-${conn.characterA}`;

    edges.push({
      id: edgeAId,
      source: conn.characterA,
      target: conn.sharedEntity,
      type: 'shared-history',
      animated: true,
      data: {
        characterAName: conn.characterAName,
        characterBName: conn.characterBName,
        entityName: conn.entityName,
        relationshipA: conn.relationshipA,
        relationshipB: conn.relationshipB,
        description: conn.description
      }
    });

    edges.push({
      id: edgeBId,
      source: conn.characterB,
      target: conn.sharedEntity,
      type: 'shared-history',
      animated: true,
      data: {
        characterAName: conn.characterBName,
        characterBName: conn.characterAName,
        entityName: conn.entityName,
        relationshipA: conn.relationshipB,
        relationshipB: conn.relationshipA,
        description: conn.description
      }
    });
  }

  return edges;
}
