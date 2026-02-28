import * as Y from 'yjs';
import { generateId } from '@highport/shared/utils/id';

export interface Faction {
  id: string;
  factionNodeId: string | null;  // Link to graph node
  name: string;
  standing: number;  // -100 to +100
  tier: string;      // Computed
  heat: number;      // 0-100 (law enforcement attention)
  lastChange: number; // timestamp
}

export type TierName = 'Hostile' | 'Cold' | 'Neutral' | 'Warm' | 'Allied';

export function computeTier(standing: number): TierName {
  if (standing < -60) return 'Hostile';
  if (standing < -20) return 'Cold';
  if (standing <= 20) return 'Neutral';
  if (standing <= 60) return 'Warm';
  return 'Allied';
}

export function getStandingColor(standing: number): string {
  // Red (-100) to Green (+100) gradient
  const normalized = (standing + 100) / 200; // 0 to 1
  const r = Math.round(255 * (1 - normalized));
  const g = Math.round(255 * normalized);
  return `rgb(${r}, ${g}, 100)`;
}

export function getReputationMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('reputationState') as Y.Map<Y.Map<unknown>>;
}

export function addFaction(doc: Y.Doc, name: string): string {
  const factions = getReputationMap(doc);
  const id = generateId('faction');
  
  doc.transact(() => {
    const factionMap = new Y.Map();
    factions.set(id, factionMap);
    factionMap.set('id', id);
    factionMap.set('factionNodeId', null);
    factionMap.set('name', name);
    factionMap.set('standing', 0);
    factionMap.set('heat', 0);
    factionMap.set('lastChange', Date.now());
  });
  
  return id;
}

export function updateFactionField(doc: Y.Doc, id: string, field: string, value: unknown): void {
  const factions = getReputationMap(doc);
  const faction = factions.get(id);
  if (faction) {
    doc.transact(() => {
      faction.set(field, value);
      faction.set('lastChange', Date.now());
    });
  }
}

export function linkFactionToNode(doc: Y.Doc, factionId: string, nodeId: string | null): void {
  updateFactionField(doc, factionId, 'factionNodeId', nodeId);
}

export function deleteFaction(doc: Y.Doc, factionId: string): void {
  const factions = getReputationMap(doc);
  if (factions.has(factionId)) {
    factions.delete(factionId);
  }
}

export function yMapToFaction(ymap: Y.Map<unknown>): Faction {
  const standing = (ymap.get('standing') as number) || 0;
  return {
    id: ymap.get('id') as string,
    factionNodeId: ymap.get('factionNodeId') as string | null,
    name: ymap.get('name') as string,
    standing,
    tier: computeTier(standing),
    heat: (ymap.get('heat') as number) || 0,
    lastChange: (ymap.get('lastChange') as number) || Date.now(),
  };
}
