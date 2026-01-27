import { describe, it, expect, beforeEach } from 'vitest';
import { detectConflict, buildSyncStateFromDb } from '../src/conflicts/detect.js';
import { resolveConflict, applyResolution, shouldQueueConflict } from '../src/conflicts/resolve.js';
import type { SyncState, IncomingChange, ConflictContext } from '../src/conflicts/types.js';

describe('Conflict Detection', () => {
  describe('detectConflict', () => {
    const now = new Date();
    const baseState: SyncState = {
      nodeId: 'node_123',
      foundryUuid: 'Actor.abc123',
      fields: {
        'hp.current': {
          value: 10,
          lastFoundrySync: new Date(now.getTime() - 10000),
          lastPlaneshiftSync: new Date(now.getTime() - 10000),
        },
      },
    };

    it('returns false for new field not in state', () => {
      const incoming: IncomingChange = {
        source: 'foundry',
        fieldPath: 'hp.max',
        newValue: 20,
        timestamp: now,
      };
      expect(detectConflict(baseState, incoming)).toBe(false);
    });

    it('returns false when no conflict within window', () => {
      const incoming: IncomingChange = {
        source: 'foundry',
        fieldPath: 'hp.current',
        newValue: 15,
        timestamp: now,
      };
      expect(detectConflict(baseState, incoming)).toBe(false);
    });

    it('returns true when opposite side changed within conflict window', () => {
      const stateWithRecentPlaneshift: SyncState = {
        ...baseState,
        fields: {
          'hp.current': {
            value: 10,
            lastFoundrySync: new Date(now.getTime() - 10000),
            lastPlaneshiftSync: new Date(now.getTime() - 2000),
          },
        },
      };

      const incoming: IncomingChange = {
        source: 'foundry',
        fieldPath: 'hp.current',
        newValue: 15,
        timestamp: now,
      };
      expect(detectConflict(stateWithRecentPlaneshift, incoming)).toBe(true);
    });
  });

  describe('buildSyncStateFromDb', () => {
    it('returns null for empty rows', () => {
      expect(buildSyncStateFromDb([])).toBe(null);
    });

    it('builds state from database rows', () => {
      const rows = [
        {
          nodeId: 'node_123',
          foundryUuid: 'Actor.abc',
          fieldPath: 'hp.current',
          currentValue: 10,
          lastFoundrySync: new Date('2025-01-01'),
          lastPlaneshiftSync: new Date('2025-01-02'),
        },
        {
          nodeId: 'node_123',
          foundryUuid: 'Actor.abc',
          fieldPath: 'hp.max',
          currentValue: 20,
          lastFoundrySync: null,
          lastPlaneshiftSync: new Date('2025-01-01'),
        },
      ];

      const state = buildSyncStateFromDb(rows);
      expect(state).not.toBe(null);
      expect(state!.nodeId).toBe('node_123');
      expect(state!.fields['hp.current'].value).toBe(10);
      expect(state!.fields['hp.max'].value).toBe(20);
    });
  });
});

describe('Conflict Resolution Matrix', () => {
  const baseContext: ConflictContext = {
    isGmEdit: false,
    fieldPath: 'notes',
    source: 'foundry',
    incomingValue: 'new value',
    serverValue: 'old value',
    incomingTimestamp: new Date(),
    serverTimestamp: new Date(Date.now() - 1000),
  };

  describe('resolveConflict', () => {
    it('GM edit from Foundry wins', () => {
      const ctx: ConflictContext = { ...baseContext, isGmEdit: true, source: 'foundry' };
      expect(resolveConflict(ctx)).toBe('keep_foundry');
    });

    it('GM edit from PlaneShift wins', () => {
      const ctx: ConflictContext = { ...baseContext, isGmEdit: true, source: 'planeshift' };
      expect(resolveConflict(ctx)).toBe('keep_planeshift');
    });

    it('Foundry stats are authoritative', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        fieldPath: 'hp.current',
        source: 'foundry',
      };
      expect(resolveConflict(ctx)).toBe('keep_foundry');
    });

    it('Foundry characteristics are authoritative', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        fieldPath: 'characteristics.str',
        source: 'foundry',
      };
      expect(resolveConflict(ctx)).toBe('keep_foundry');
    });

    it('Credits from Foundry are authoritative', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        fieldPath: 'credits',
        source: 'foundry',
      };
      expect(resolveConflict(ctx)).toBe('keep_foundry');
    });

    it('Text fields queue for GM review', () => {
      const ctx: ConflictContext = { ...baseContext, fieldPath: 'notes' };
      expect(resolveConflict(ctx)).toBe('queue');
    });

    it('Description fields queue for GM review', () => {
      const ctx: ConflictContext = { ...baseContext, fieldPath: 'description' };
      expect(resolveConflict(ctx)).toBe('queue');
    });

    it('Default case uses Last Write Wins', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        fieldPath: 'custom.field',
        source: 'planeshift',
      };
      expect(resolveConflict(ctx)).toBe('lww');
    });

    it('Stats from PlaneShift use LWW (not authoritative)', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        fieldPath: 'hp.current',
        source: 'planeshift',
      };
      expect(resolveConflict(ctx)).toBe('lww');
    });
  });

  describe('applyResolution', () => {
    it('keep_foundry returns foundry value when source is foundry', () => {
      const ctx: ConflictContext = { ...baseContext, source: 'foundry' };
      const result = applyResolution('keep_foundry', ctx);
      expect(result.value).toBe('new value');
      expect(result.source).toBe('foundry');
    });

    it('keep_foundry returns server value when source is planeshift', () => {
      const ctx: ConflictContext = { ...baseContext, source: 'planeshift' };
      const result = applyResolution('keep_foundry', ctx);
      expect(result.value).toBe('old value');
      expect(result.source).toBe('foundry');
    });

    it('lww returns incoming when timestamp is newer', () => {
      const ctx: ConflictContext = {
        ...baseContext,
        incomingTimestamp: new Date(Date.now() + 1000),
        serverTimestamp: new Date(Date.now() - 1000),
      };
      const result = applyResolution('lww', ctx);
      expect(result.value).toBe('new value');
    });

    it('queue returns server value (pending GM decision)', () => {
      const result = applyResolution('queue', baseContext);
      expect(result.value).toBe('old value');
      expect(result.source).toBe('planeshift');
    });
  });

  describe('shouldQueueConflict', () => {
    it('returns true for queue resolution', () => {
      expect(shouldQueueConflict('queue')).toBe(true);
    });

    it('returns false for keep_foundry', () => {
      expect(shouldQueueConflict('keep_foundry')).toBe(false);
    });

    it('returns false for lww', () => {
      expect(shouldQueueConflict('lww')).toBe(false);
    });
  });
});
