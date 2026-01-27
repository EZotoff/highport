import { describe, it, expect } from 'vitest';
import type { GraphNode } from '@planeshift/shared/types/graph';
import {
  parseFoundryActors,
  matchActorsToNodes,
  mapActorToMetadata,
  type FoundryActor,
} from '../lib/foundry-import';

describe('Foundry Import', () => {
  describe('parseFoundryActors', () => {
    it('parses a single actor object', () => {
      const json = JSON.stringify({
        _id: 'actor1',
        name: 'Captain Jack',
        type: 'traveller',
        system: { hits: { value: 10, max: 20 } },
      });

      const result = parseFoundryActors(json);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Captain Jack');
    });

    it('parses an array of actors', () => {
      const json = JSON.stringify([
        { _id: 'a1', name: 'Actor One', type: 'traveller', system: {} },
        { _id: 'a2', name: 'Actor Two', type: 'npc', system: {} },
      ]);

      const result = parseFoundryActors(json);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Actor One');
      expect(result[1].name).toBe('Actor Two');
    });

    it('throws on invalid JSON', () => {
      expect(() => parseFoundryActors('not json')).toThrow();
    });
  });

  describe('mapActorToMetadata', () => {
    it('maps hits to hp', () => {
      const actor: FoundryActor = {
        _id: 'test',
        name: 'Test',
        type: 'traveller',
        system: { hits: { value: 15, max: 25 } },
      };

      const meta = mapActorToMetadata(actor);
      expect(meta.hp).toEqual({ current: 15, max: 25 });
    });

    it('maps characteristics', () => {
      const actor: FoundryActor = {
        _id: 'test',
        name: 'Test',
        type: 'traveller',
        system: {
          characteristics: {
            str: { value: 8 },
            dex: { value: 10 },
            end: { value: 7 },
          },
        },
      };

      const meta = mapActorToMetadata(actor);
      expect(meta.characteristics).toEqual({ str: 8, dex: 10, end: 7 });
    });

    it('maps finance.cash to credits', () => {
      const actor: FoundryActor = {
        _id: 'test',
        name: 'Test',
        type: 'traveller',
        system: { finance: { cash: 50000 } },
      };

      const meta = mapActorToMetadata(actor);
      expect(meta.credits).toBe(50000);
    });

    it('handles missing system properties', () => {
      const actor: FoundryActor = {
        _id: 'test',
        name: 'Test',
        type: 'traveller',
        system: {},
      };

      const meta = mapActorToMetadata(actor);
      expect(meta.hp).toEqual({ current: undefined, max: undefined });
      expect(meta.characteristics).toEqual({});
      expect(meta.credits).toBeUndefined();
    });
  });

  describe('matchActorsToNodes', () => {
    const createNode = (id: string, label: string, foundryUuid?: string): GraphNode => ({
      id,
      type: 'traveller',
      label,
      position: { x: 0, y: 0 },
      metadata: foundryUuid ? { foundry_uuid: foundryUuid } : {},
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: 'user',
    });

    it('matches by foundry_uuid', () => {
      const actors: FoundryActor[] = [
        { _id: 'abc123', name: 'Captain', type: 'traveller', system: {} },
      ];
      const nodes = [createNode('node1', 'Different Name', 'Actor.abc123')];

      const result = matchActorsToNodes(actors, nodes);
      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].nodeId).toBe('node1');
      expect(result.unmatched).toHaveLength(0);
    });

    it('matches by name case-insensitively', () => {
      const actors: FoundryActor[] = [
        { _id: 'xyz', name: 'Captain Jack', type: 'traveller', system: {} },
      ];
      const nodes = [createNode('node1', 'captain jack')];

      const result = matchActorsToNodes(actors, nodes);
      expect(result.matched).toHaveLength(1);
      expect(result.matched[0].actorName).toBe('Captain Jack');
    });

    it('reports unmatched actors', () => {
      const actors: FoundryActor[] = [
        { _id: 'unknown', name: 'Unknown Actor', type: 'traveller', system: {} },
      ];
      const nodes = [createNode('node1', 'Different Name')];

      const result = matchActorsToNodes(actors, nodes);
      expect(result.matched).toHaveLength(0);
      expect(result.unmatched).toHaveLength(1);
      expect(result.unmatched[0].reason).toBe('No matching node found');
    });

    it('handles multiple actors with mixed matching', () => {
      const actors: FoundryActor[] = [
        { _id: 'a1', name: 'Found Actor', type: 'traveller', system: { hits: { value: 5, max: 10 } } },
        { _id: 'a2', name: 'Missing', type: 'npc', system: {} },
        { _id: 'a3', name: 'Another', type: 'traveller', system: {} },
      ];
      const nodes = [
        createNode('n1', 'Found Actor'),
        createNode('n2', 'another'),
      ];

      const result = matchActorsToNodes(actors, nodes);
      expect(result.matched).toHaveLength(2);
      expect(result.unmatched).toHaveLength(1);
      expect(result.unmatched[0].actorName).toBe('Missing');
    });

    it('includes mapped changes in matched results', () => {
      const actors: FoundryActor[] = [
        {
          _id: 'a1',
          name: 'Test',
          type: 'traveller',
          system: {
            hits: { value: 12, max: 20 },
            characteristics: { str: { value: 9 } },
            finance: { cash: 1000 },
          },
        },
      ];
      const nodes = [createNode('n1', 'Test')];

      const result = matchActorsToNodes(actors, nodes);
      expect(result.matched[0].changes).toEqual({
        hp: { current: 12, max: 20 },
        characteristics: { str: 9 },
        credits: 1000,
      });
    });
  });
});
