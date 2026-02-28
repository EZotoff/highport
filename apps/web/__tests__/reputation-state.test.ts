import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import {
  addFaction,
  updateFactionField,
  deleteFaction,
  yMapToFaction,
  getReputationMap,
  computeTier,
  linkFactionToNode,
} from '../lib/reputation-state';
import { createYDoc } from '../lib/ydoc';

describe('Reputation State Logic', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = createYDoc();
  });

  it('computes tiers correctly', () => {
    expect(computeTier(-100)).toBe('Hostile');
    expect(computeTier(-61)).toBe('Hostile');
    expect(computeTier(-60)).toBe('Cold');
    expect(computeTier(-21)).toBe('Cold');
    expect(computeTier(-20)).toBe('Neutral');
    expect(computeTier(0)).toBe('Neutral');
    expect(computeTier(20)).toBe('Neutral');
    expect(computeTier(21)).toBe('Warm');
    expect(computeTier(60)).toBe('Warm');
    expect(computeTier(61)).toBe('Allied');
    expect(computeTier(100)).toBe('Allied');
  });

  it('adds a new faction', () => {
    const id = addFaction(doc, 'Test Faction');
    const factionsMap = getReputationMap(doc);

    expect(factionsMap.size).toBe(1);

    const factionMap = factionsMap.get(id) as Y.Map<unknown>;
    expect(factionMap.get('name')).toBe('Test Faction');
    expect(factionMap.get('standing')).toBe(0);
    expect(factionMap.get('heat')).toBe(0);
    expect(factionMap.get('lastChange')).toBeDefined();
    expect(factionMap.get('factionNodeId')).toBeNull();
  });

  it('updates faction standing', () => {
    const id = addFaction(doc, 'Test Faction');

    updateFactionField(doc, id, 'standing', -80);

    const factionsMap = getReputationMap(doc);
    const factionMap = factionsMap.get(id) as Y.Map<unknown>;

    expect(factionMap.get('standing')).toBe(-80);
  });

  it('updates other faction fields', () => {
    const id = addFaction(doc, 'Test Faction');

    updateFactionField(doc, id, 'name', 'Renamed Faction');
    updateFactionField(doc, id, 'heat', 50);
    linkFactionToNode(doc, id, 'node-123');

    const factionsMap = getReputationMap(doc);
    const factionMap = factionsMap.get(id) as Y.Map<unknown>;

    expect(factionMap.get('name')).toBe('Renamed Faction');
    expect(factionMap.get('heat')).toBe(50);
    expect(factionMap.get('factionNodeId')).toBe('node-123');
  });

  it('converts Y.Map to Faction object', () => {
    const id = addFaction(doc, 'Test Faction');
    updateFactionField(doc, id, 'standing', 75);

    const factionsMap = getReputationMap(doc);
    const ymap = factionsMap.get(id) as Y.Map<unknown>;

    const faction = yMapToFaction(ymap);
    expect(faction.name).toBe('Test Faction');
    expect(faction.standing).toBe(75);
    expect(faction.tier).toBe('Allied');
    expect(faction.id).toBe(id);
  });

  it('deletes a faction', () => {
    const id = addFaction(doc, 'ToDelete');
    deleteFaction(doc, id);

    const factionsMap = getReputationMap(doc);
    expect(factionsMap.has(id)).toBe(false);
  });
});
