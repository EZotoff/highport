import { getYDoc, getEdgesMap } from '../ydoc';
import { getCrossCharacterLinks, findNodeIdByChargenId } from './state';
import { addNode, addEdge } from '../yjs-helpers';
import type { GraphNode, GraphEdge } from '@highport/shared/types/graph';
import type { ChargenCharacter } from './types';
import { getCareer, type CharacteristicSet } from '@highport/mgt2e';
import { getRankInfo } from './term-resolution';

export interface FinalizedCharacterData {
  graphNodeId: string;
  name: string;
  age: number;
  characteristics: CharacteristicSet;
  skills: Record<string, number>;
  careerSummary: string;
  credits: number;
  benefits: string[];
  connections: Array<{ nodeId: string; relationship: string; name: string }>;
}

export function createCharacterNode(character: ChargenCharacter): FinalizedCharacterData {
  const doc = getYDoc();
  const nodeId = crypto.randomUUID();

  const careerSummary = buildCareerSummary(character);

  const connections = character.terms.flatMap((term) =>
    term.spawnedEntities.map((e) => ({
      nodeId: e.graphNodeId,
      relationship: e.relationship || 'connected',
      name: e.name,
    })),
  );

  const node: GraphNode = {
    id: nodeId,
    type: 'traveller', // Player characters use 'traveller' type
    label: character.name || 'Unnamed Character',
    position: { x: 0, y: 0 },
    metadata: {
      description: buildCharacterDescription(character),
      age: character.age,
      characteristics: character.characteristics,
      skills: character.skills,
      careerHistory: character.terms.map((t) => ({
        career: t.careerId,
        assignment: t.assignmentId,
        term: t.termNumber,
        rank: t.currentRank,
      })),
      benefits: character.benefits,
      credits: character.credits,
      chargenId: character.id,
    },
    locked: false,
    hidden: false,
    created_at: Date.now(),
    created_by: character.playerId,
  };

  doc.transact(() => {
    addNode(doc, node);

    connections.forEach((conn) => {
      const edge: GraphEdge = {
        id: crypto.randomUUID(),
        source_id: nodeId,
        target_id: conn.nodeId,
        relation_label: formatRelationship(conn.relationship),
        type: 'directional',
        weight: 1,
        style: 'solid',
        color: getRelationshipColor(conn.relationship),
        hidden: false,
      };
      addEdge(doc, edge);
    });
    // Create edges for any accepted cross-character links involving this character
    const crossLinks = getCrossCharacterLinks(doc);
    crossLinks.forEach((link) => {
      if (link.status === 'accepted') {
        const isSource = link.sourceCharId === character.id;
        const isTarget = link.targetCharId === character.id;
        if (isSource || isTarget) {
          const otherCharId = isSource ? link.targetCharId : link.sourceCharId;
          const otherNodeId = findNodeIdByChargenId(doc, otherCharId);
          if (otherNodeId) {
            // Check if edge already exists
            const edges = getEdgesMap(doc);
            let edgeExists = false;
            edges.forEach((edgeMap) => {
              const sId = edgeMap.get('source_id') as string;
              const tId = edgeMap.get('target_id') as string;
              if (
                (sId === nodeId && tId === otherNodeId) ||
                (sId === otherNodeId && tId === nodeId)
              ) {
                edgeExists = true;
              }
            });

            if (!edgeExists) {
              const edge: GraphEdge = {
                id: crypto.randomUUID(),
                source_id: nodeId,
                target_id: otherNodeId,
                relation_label: link.relationship,
                type: 'directional',
                weight: 1,
                style: 'solid',
                color: '#71717a',
                hidden: false,
              };
              addEdge(doc, edge);
            }
          }
        }
      }
    });
  }, 'chargen-finalize');

  return {
    graphNodeId: nodeId,
    name: character.name,
    age: character.age,
    characteristics: character.characteristics,
    skills: character.skills,
    careerSummary,
    credits: character.credits,
    benefits: character.benefits,
    connections,
  };
}

function buildCareerSummary(character: ChargenCharacter): string {
  if (character.terms.length === 0) return 'No career history';

  const careerGroups = new Map<string, number>();
  let lastCareerId = '';
  let lastRank = 0;

  character.terms.forEach((term) => {
    careerGroups.set(term.careerId, (careerGroups.get(term.careerId) || 0) + 1);
    lastCareerId = term.careerId;
    lastRank = term.currentRank;
  });

  const career = getCareer(lastCareerId);
  const rankInfo = career ? getRankInfo(career, lastRank) : null;

  const parts: string[] = [];
  careerGroups.forEach((terms, careerId) => {
    const c = getCareer(careerId);
    parts.push(`${c?.name || careerId} (${terms} term${terms > 1 ? 's' : ''})`);
  });

  if (rankInfo) {
    return `${rankInfo.title}, ${parts.join(', ')}`;
  }
  return parts.join(', ');
}

function buildCharacterDescription(character: ChargenCharacter): string {
  const career = getCareer(character.terms[character.terms.length - 1]?.careerId || '');
  return `A ${character.age}-year-old former ${career?.name || 'adventurer'}.`;
}

function formatRelationship(rel: string): string {
  switch (rel) {
    case 'ally':
      return 'Allied with';
    case 'contact':
      return 'Contact of';
    case 'rival':
      return 'Rival of';
    case 'enemy':
      return 'Enemy of';
    default:
      return 'Connected to';
  }
}

function getRelationshipColor(rel: string): string {
  switch (rel) {
    case 'ally':
      return '#22c55e';
    case 'contact':
      return '#3b82f6';
    case 'rival':
      return '#f59e0b';
    case 'enemy':
      return '#ef4444';
    default:
      return '#71717a';
  }
}

export function formatSkillsForDisplay(skills: Record<string, number>): string[] {
  return Object.entries(skills)
    .filter(([_, level]) => level > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, level]) => {
      // Format skill name: "pilot.spacecraft" → "Pilot (Spacecraft) 2"
      const parts = skill.split('.');
      const base = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const specialty = parts[1]
        ? ` (${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)})`
        : '';
      return `${base}${specialty} ${level}`;
    });
}

export function formatSkillsLevel0(skills: Record<string, number>): string[] {
  return Object.entries(skills)
    .filter(([_, level]) => level === 0)
    .map(([skill]) => {
      const parts = skill.split('.');
      const base = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const specialty = parts[1]
        ? ` (${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)})`
        : '';
      return `${base}${specialty}`;
    });
}
