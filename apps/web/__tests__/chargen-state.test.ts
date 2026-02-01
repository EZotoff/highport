import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  createSession,
  getSession,
  updateSessionSettings,
  endSession,
  addEntityToPool,
  getEntityPool,
  getEntityFromPool,
  requestConnection,
  getConnectionRequests,
  resolveConnectionRequest,
  getEntityClaimers,
} from '../lib/chargen/state';
import { DEFAULT_SESSION_SETTINGS } from '../lib/chargen/types';

describe('Chargen Session State', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  afterEach(() => {
    doc.destroy();
  });

  describe('createSession', () => {
    it('should create a session with unique ID', () => {
      const sessionId = createSession(doc, 'campaign-123', 'gm-user-1');
      const session = getSession(doc);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should set default settings', () => {
      createSession(doc, 'campaign-123', 'gm-user-1');
      const session = getSession(doc);

      expect(session?.settings).toEqual(DEFAULT_SESSION_SETTINGS);
      expect(session?.settings.allowedCareers).toEqual([]);
      expect(session?.settings.aiVerbosity).toBe('structured');
      expect(session?.settings.requireGMApproval).toBe(false);
      expect(session?.settings.allowCrossPlayerConnections).toBe(true);
      expect(session?.settings.isLocked).toBe(false);
    });

    it('should set createdBy to GM user ID', () => {
      createSession(doc, 'campaign-123', 'gm-user-1');
      const session = getSession(doc);

      expect(session?.createdBy).toBe('gm-user-1');
    });

    it('should set status to active', () => {
      createSession(doc, 'campaign-123', 'gm-user-1');
      const session = getSession(doc);

      expect(session?.status).toBe('active');
    });

    it('should set campaignId correctly', () => {
      createSession(doc, 'campaign-456', 'gm-user-2');
      const session = getSession(doc);

      expect(session?.campaignId).toBe('campaign-456');
    });

    it('should set createdAt timestamp', () => {
      const beforeTime = Date.now();
      createSession(doc, 'campaign-123', 'gm-user-1');
      const afterTime = Date.now();
      const session = getSession(doc);

      expect(session?.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(session?.createdAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getSession', () => {
    it('should return null when no session exists', () => {
      const session = getSession(doc);
      expect(session).toBeNull();
    });

    it('should retrieve created session', () => {
      const sessionId = createSession(doc, 'campaign-123', 'gm-user-1');
      const session = getSession(doc);

      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
    });
  });

  describe('updateSessionSettings', () => {
    beforeEach(() => {
      createSession(doc, 'campaign-123', 'gm-user-1');
    });

    it('should update allowed careers', () => {
      updateSessionSettings(doc, { allowedCareers: ['Navy', 'Marine'] });
      const session = getSession(doc);

      expect(session?.settings.allowedCareers).toEqual(['Navy', 'Marine']);
    });

    it('should toggle requireGMApproval', () => {
      updateSessionSettings(doc, { requireGMApproval: true });
      const session = getSession(doc);

      expect(session?.settings.requireGMApproval).toBe(true);
    });

    it('should update aiVerbosity', () => {
      updateSessionSettings(doc, { aiVerbosity: 'rich' });
      const session = getSession(doc);

      expect(session?.settings.aiVerbosity).toBe('rich');
    });

    it('should update multiple settings at once', () => {
      updateSessionSettings(doc, {
        allowedCareers: ['Scout'],
        requireGMApproval: true,
        isLocked: true,
      });
      const session = getSession(doc);

      expect(session?.settings.allowedCareers).toEqual(['Scout']);
      expect(session?.settings.requireGMApproval).toBe(true);
      expect(session?.settings.isLocked).toBe(true);
      expect(session?.settings.allowCrossPlayerConnections).toBe(true); // unchanged
    });

    it('should preserve unchanged settings', () => {
      updateSessionSettings(doc, { allowedCareers: ['Navy'] });
      updateSessionSettings(doc, { requireGMApproval: true });
      const session = getSession(doc);

      expect(session?.settings.allowedCareers).toEqual(['Navy']);
      expect(session?.settings.requireGMApproval).toBe(true);
    });
  });

  describe('endSession', () => {
    it('should mark session as completed', () => {
      createSession(doc, 'campaign-123', 'gm-user-1');
      endSession(doc);
      const session = getSession(doc);

      expect(session?.status).toBe('completed');
    });

    it('should preserve other session data', () => {
      const sessionId = createSession(doc, 'campaign-123', 'gm-user-1');
      updateSessionSettings(doc, { allowedCareers: ['Navy'] });
      endSession(doc);
      const session = getSession(doc);

      expect(session?.id).toBe(sessionId);
      expect(session?.campaignId).toBe('campaign-123');
      expect(session?.settings.allowedCareers).toEqual(['Navy']);
    });
  });

  describe('Entity Pool', () => {
    beforeEach(() => {
      createSession(doc, 'campaign-123', 'gm-user-1');
    });

    it('should add entity to pool', () => {
      const entityId = addEntityToPool(doc, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Test NPC',
        description: 'A test character',
        metadata: { foo: 'bar' },
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      expect(entityId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      const entity = getEntityFromPool(doc, entityId);
      expect(entity).not.toBeNull();
      expect(entity?.name).toBe('Test NPC');
      expect(entity?.type).toBe('npc');
    });

    it('should retrieve all entities', () => {
      addEntityToPool(doc, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'NPC 1',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      addEntityToPool(doc, {
        type: 'location',
        createdBy: 'user-2',
        createdFor: 'char-2',
        createdDuring: { termNumber: 2, eventRoll: 8 },
        ownedBy: 'gm',
        name: 'Location 1',
        description: 'A place',
        metadata: {},
        graphNodeId: 'node-2',
        claimedBy: [],
      });

      const entities = getEntityPool(doc);
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.name)).toContain('NPC 1');
      expect(entities.map(e => e.name)).toContain('Location 1');
    });

    it('should filter entities by type', () => {
      addEntityToPool(doc, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'NPC 1',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      addEntityToPool(doc, {
        type: 'location',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Location 1',
        metadata: {},
        graphNodeId: 'node-2',
        claimedBy: [],
      });

      const entities = getEntityPool(doc);
      const npcs = entities.filter(e => e.type === 'npc');
      const locations = entities.filter(e => e.type === 'location');

      expect(npcs).toHaveLength(1);
      expect(locations).toHaveLength(1);
      expect(npcs[0].name).toBe('NPC 1');
      expect(locations[0].name).toBe('Location 1');
    });

    it('should handle entity with metadata', () => {
      const entityId = addEntityToPool(doc, {
        type: 'item',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 3, eventRoll: 11 },
        ownedBy: 'user-1',
        name: 'Magic Sword',
        description: 'A legendary weapon',
        metadata: {
          damage: '2d6',
          weight: 5,
          enchantments: ['fire', 'ice'],
        },
        graphNodeId: 'node-3',
        claimedBy: [],
      });

      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.metadata).toEqual({
        damage: '2d6',
        weight: 5,
        enchantments: ['fire', 'ice'],
      });
    });

    it('should return null for non-existent entity', () => {
      const entity = getEntityFromPool(doc, 'non-existent-id');
      expect(entity).toBeNull();
    });

    it('should return empty array when pool is empty', () => {
      const entities = getEntityPool(doc);
      expect(entities).toEqual([]);
    });
  });

  describe('Connection Requests', () => {
    let entityId: string;

    beforeEach(() => {
      createSession(doc, 'campaign-123', 'gm-user-1');
      entityId = addEntityToPool(doc, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Shared NPC',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });
    });

    it('should create a connection request', () => {
      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'ally',
        'Want to connect',
        'user-2'
      );

      expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      const requests = getConnectionRequests(doc);
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe(requestId);
      expect(requests[0].requesterCharId).toBe('char-2');
      expect(requests[0].entityId).toBe(entityId);
      expect(requests[0].relationship).toBe('ally');
      expect(requests[0].status).toBe('pending');
      expect(requests[0].note).toBe('Want to connect');
    });

    it('should approve a request', () => {
      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'contact',
        undefined,
        'user-2'
      );

      const beforeTime = Date.now();
      resolveConnectionRequest(doc, requestId, true, 'gm-user-1');
      const afterTime = Date.now();

      const requests = getConnectionRequests(doc);
      const resolved = requests.find(r => r.id === requestId);

      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolvedBy).toBe('gm-user-1');
      expect(resolved?.resolvedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(resolved?.resolvedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should reject a request', () => {
      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'rival',
        undefined,
        'user-2'
      );

      resolveConnectionRequest(doc, requestId, false, 'gm-user-1');

      const requests = getConnectionRequests(doc);
      const resolved = requests.find(r => r.id === requestId);

      expect(resolved?.status).toBe('rejected');
      expect(resolved?.resolvedBy).toBe('gm-user-1');
    });

    it('should add character to entity claimedBy on approval', () => {
      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'ally',
        undefined,
        'user-2'
      );

      resolveConnectionRequest(doc, requestId, true, 'gm-user-1');

      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.claimedBy).toContain('char-2');
    });

    it('should not duplicate character in claimedBy', () => {
      const requestId1 = requestConnection(doc, 'char-2', entityId, 'ally', undefined, 'user-2');
      resolveConnectionRequest(doc, requestId1, true, 'gm-user-1');

      const requestId2 = requestConnection(doc, 'char-2', entityId, 'contact', undefined, 'user-2');
      resolveConnectionRequest(doc, requestId2, true, 'gm-user-1');

      const entity = getEntityFromPool(doc, entityId);
      const char2Count = entity?.claimedBy.filter(id => id === 'char-2').length;
      expect(char2Count).toBe(1);
    });

    it('should not modify entity claimedBy on rejection', () => {
      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'enemy',
        undefined,
        'user-2'
      );

      resolveConnectionRequest(doc, requestId, false, 'gm-user-1');

      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.claimedBy).not.toContain('char-2');
      expect(entity?.claimedBy).toEqual([]);
    });

    it('should handle resolving non-existent request gracefully', () => {
      resolveConnectionRequest(doc, 'non-existent-id', true, 'gm-user-1');

      const requests = getConnectionRequests(doc);
      expect(requests).toHaveLength(0);
    });

    it('should track multiple pending requests', () => {
      requestConnection(doc, 'char-2', entityId, 'ally', undefined, 'user-2');
      requestConnection(doc, 'char-3', entityId, 'contact', undefined, 'user-3');

      const requests = getConnectionRequests(doc);
      expect(requests).toHaveLength(2);
      expect(requests[0].status).toBe('pending');
      expect(requests[1].status).toBe('pending');
    });

    it('should allow multiple characters to claim same entity', () => {
      const req1 = requestConnection(doc, 'char-2', entityId, 'ally', undefined, 'user-2');
      const req2 = requestConnection(doc, 'char-3', entityId, 'contact', undefined, 'user-3');

      resolveConnectionRequest(doc, req1, true, 'gm-user-1');
      resolveConnectionRequest(doc, req2, true, 'gm-user-1');

      const claimers = getEntityClaimers(doc, entityId);
      expect(claimers).toHaveLength(2);
      expect(claimers).toContain('char-2');
      expect(claimers).toContain('char-3');
    });

    it('should return empty array for entity with no claimers', () => {
      const claimers = getEntityClaimers(doc, entityId);
      expect(claimers).toEqual([]);
    });

    it('should return empty array for non-existent entity claimers', () => {
      const claimers = getEntityClaimers(doc, 'non-existent-id');
      expect(claimers).toEqual([]);
    });
  });
});
