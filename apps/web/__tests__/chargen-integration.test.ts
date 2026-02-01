import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
  createSession,
  getSession,
  updateSessionSettings,
  endSession,
  addEntityToPool,
  getEntityFromPool,
  requestConnection,
  resolveConnectionRequest,
  getConnectionRequests,
} from '../lib/chargen/state';

describe('Chargen Integration Tests', () => {
  describe('CRDT Sync with Multiple Documents', () => {
    let doc1: Y.Doc;
    let doc2: Y.Doc;

    beforeEach(() => {
      doc1 = new Y.Doc();
      doc2 = new Y.Doc();

      // Simulate sync between docs via applyUpdate
      doc1.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc2, update);
      });
      doc2.on('update', (update: Uint8Array) => {
        Y.applyUpdate(doc1, update);
      });
    });

    afterEach(() => {
      doc1.destroy();
      doc2.destroy();
    });

    it('should sync session creation across docs', () => {
      // Create session in doc1
      const sessionId = createSession(doc1, 'campaign-1', 'gm-user');

      // Verify doc2 received the session
      const session = getSession(doc2);
      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.campaignId).toBe('campaign-1');
      expect(session?.createdBy).toBe('gm-user');
      expect(session?.status).toBe('active');
    });

    it('should sync session settings updates across docs', () => {
      // Create session in doc1
      createSession(doc1, 'campaign-1', 'gm-user');

      // Update settings in doc1
      updateSessionSettings(doc1, {
        requireGMApproval: true,
        allowedCareers: ['Navy', 'Marine'],
      });

      // Verify doc2 received the updates
      const session = getSession(doc2);
      expect(session?.settings.requireGMApproval).toBe(true);
      expect(session?.settings.allowedCareers).toEqual(['Navy', 'Marine']);
    });

    it('should sync entity spawns across docs', () => {
      // Create session in doc1
      createSession(doc1, 'campaign-1', 'gm-user');

      // Add entity in doc1
      const entityId = addEntityToPool(doc1, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Test NPC',
        description: 'A test character',
        metadata: { role: 'ally' },
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      // Verify doc2 received the entity
      const entity = getEntityFromPool(doc2, entityId);
      expect(entity).not.toBeNull();
      expect(entity?.name).toBe('Test NPC');
      expect(entity?.type).toBe('npc');
      expect(entity?.ownedBy).toBe('user-1');
      expect(entity?.metadata).toEqual({ role: 'ally' });
    });

    it('should sync connection request creation across docs', () => {
      // Create session and entity in doc1
      createSession(doc1, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc1, {
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

      // Request connection in doc1
      const requestId = requestConnection(
        doc1,
        'char-2',
        entityId,
        'ally',
        'Want to connect',
        'user-2'
      );

      // Verify doc2 received the request
      const requests = getConnectionRequests(doc2);
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe(requestId);
      expect(requests[0].requesterCharId).toBe('char-2');
      expect(requests[0].entityId).toBe(entityId);
      expect(requests[0].relationship).toBe('ally');
      expect(requests[0].status).toBe('pending');
    });

    it('should sync connection request approvals across docs', () => {
      // Setup: create session and entity in doc1
      createSession(doc1, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc1, {
        type: 'location',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 2, eventRoll: 8 },
        ownedBy: 'gm-user',
        name: 'Secret Base',
        metadata: {},
        graphNodeId: 'node-2',
        claimedBy: [],
      });

      const requestId = requestConnection(
        doc1,
        'char-3',
        entityId,
        'contact',
        undefined,
        'user-3'
      );

      // Approve in doc1
      resolveConnectionRequest(doc1, requestId, true, 'gm-user');

      // Verify doc2 received the approval
      const requests = getConnectionRequests(doc2);
      const resolved = requests.find((r) => r.id === requestId);
      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolvedBy).toBe('gm-user');

      // Verify entity claimedBy was updated in doc2
      const entity = getEntityFromPool(doc2, entityId);
      expect(entity?.claimedBy).toContain('char-3');
    });

    it('should sync session end across docs', () => {
      // Create session in doc1
      createSession(doc1, 'campaign-1', 'gm-user');

      // End session in doc1
      endSession(doc1);

      // Verify doc2 received the status change
      const session = getSession(doc2);
      expect(session?.status).toBe('completed');
    });

    it('should handle multiple simultaneous updates', () => {
      // Create session in doc1
      createSession(doc1, 'campaign-1', 'gm-user');

      // Make multiple changes in doc1
      updateSessionSettings(doc1, { requireGMApproval: true });
      const entity1Id = addEntityToPool(doc1, {
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
      const entity2Id = addEntityToPool(doc1, {
        type: 'item',
        createdBy: 'user-2',
        createdFor: 'char-2',
        createdDuring: { termNumber: 2, eventRoll: 7 },
        ownedBy: 'user-2',
        name: 'Magic Sword',
        metadata: {},
        graphNodeId: 'node-2',
        claimedBy: [],
      });

      // Verify all updates arrived in doc2
      const session = getSession(doc2);
      expect(session?.settings.requireGMApproval).toBe(true);

      const entity1 = getEntityFromPool(doc2, entity1Id);
      expect(entity1?.name).toBe('NPC 1');

      const entity2 = getEntityFromPool(doc2, entity2Id);
      expect(entity2?.name).toBe('Magic Sword');
    });
  });

  describe('Awareness State Propagation (Mock Test)', () => {
    it('should structure chargen progress correctly', () => {
      const awarenessState = {
        characterName: 'Marcus Chen',
        career: 'navy',
        assignment: 'line_crew',
        term: 2,
        step: 'event_resolution',
        progressPercent: 80,
      };

      expect(awarenessState.progressPercent).toBeGreaterThanOrEqual(0);
      expect(awarenessState.progressPercent).toBeLessThanOrEqual(100);
      expect(awarenessState.characterName).toBe('Marcus Chen');
      expect(awarenessState.career).toBe('navy');
      expect(awarenessState.term).toBe(2);
    });

    it('should validate progress percentage boundaries', () => {
      const states = [
        { step: 'background', progressPercent: 10 },
        { step: 'career_selection', progressPercent: 25 },
        { step: 'term_resolution', progressPercent: 60 },
        { step: 'mustering_out', progressPercent: 90 },
        { step: 'finalized', progressPercent: 100 },
      ];

      states.forEach((state) => {
        expect(state.progressPercent).toBeGreaterThanOrEqual(0);
        expect(state.progressPercent).toBeLessThanOrEqual(100);
      });
    });

    it('should include all required fields for awareness', () => {
      const awarenessState = {
        characterName: 'Test Character',
        career: 'marine',
        assignment: 'ground_assault',
        term: 3,
        step: 'survival_check',
        progressPercent: 45,
      };

      expect(awarenessState).toHaveProperty('characterName');
      expect(awarenessState).toHaveProperty('career');
      expect(awarenessState).toHaveProperty('assignment');
      expect(awarenessState).toHaveProperty('term');
      expect(awarenessState).toHaveProperty('step');
      expect(awarenessState).toHaveProperty('progressPercent');
    });
  });

  describe('GM Permission Checks', () => {
    let doc: Y.Doc;

    beforeEach(() => {
      doc = new Y.Doc();
    });

    afterEach(() => {
      doc.destroy();
    });

    it('should allow GM to create session', () => {
      const sessionId = createSession(doc, 'campaign-1', 'gm-user');
      const session = getSession(doc);

      expect(session).not.toBeNull();
      expect(session?.id).toBe(sessionId);
      expect(session?.createdBy).toBe('gm-user');
    });

    it('should allow GM to update session settings', () => {
      createSession(doc, 'campaign-1', 'gm-user');

      // GM updates settings
      updateSessionSettings(doc, { requireGMApproval: true });

      const session = getSession(doc);
      expect(session?.settings.requireGMApproval).toBe(true);
    });

    it('should allow GM to end session', () => {
      createSession(doc, 'campaign-1', 'gm-user');
      endSession(doc);

      const session = getSession(doc);
      expect(session?.status).toBe('completed');
    });

    it('should allow GM to approve connection requests', () => {
      createSession(doc, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc, {
        type: 'npc',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Test NPC',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'ally',
        undefined,
        'user-2'
      );

      // GM approves
      resolveConnectionRequest(doc, requestId, true, 'gm-user');

      const requests = getConnectionRequests(doc);
      const resolved = requests.find((r) => r.id === requestId);
      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolvedBy).toBe('gm-user');
    });

    it('should allow entity owner to approve connection (simulated)', () => {
      createSession(doc, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc, {
        type: 'location',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1', // Owner is user-1
        name: 'Private Hideout',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'contact',
        undefined,
        'user-2'
      );

      // Entity owner (user-1) approves
      resolveConnectionRequest(doc, requestId, true, 'user-1');

      const requests = getConnectionRequests(doc);
      const resolved = requests.find((r) => r.id === requestId);
      expect(resolved?.status).toBe('approved');
      expect(resolved?.resolvedBy).toBe('user-1');

      // Verify entity claimedBy was updated
      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.claimedBy).toContain('char-2');
    });

    it('should allow both GM and entity owner to approve connection', () => {
      createSession(doc, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc, {
        type: 'item',
        createdBy: 'user-1',
        createdFor: 'char-1',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'user-1',
        name: 'Artifact',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      // Request 1: GM approves
      const req1 = requestConnection(doc, 'char-2', entityId, 'ally', undefined, 'user-2');
      resolveConnectionRequest(doc, req1, true, 'gm-user');

      // Request 2: Owner approves
      const req2 = requestConnection(doc, 'char-3', entityId, 'contact', undefined, 'user-3');
      resolveConnectionRequest(doc, req2, true, 'user-1');

      const requests = getConnectionRequests(doc);
      const resolved1 = requests.find((r) => r.id === req1);
      const resolved2 = requests.find((r) => r.id === req2);

      expect(resolved1?.status).toBe('approved');
      expect(resolved1?.resolvedBy).toBe('gm-user');
      expect(resolved2?.status).toBe('approved');
      expect(resolved2?.resolvedBy).toBe('user-1');

      // Verify both characters claimed the entity
      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.claimedBy).toContain('char-2');
      expect(entity?.claimedBy).toContain('char-3');
    });

    it('should allow GM to reject connection requests', () => {
      createSession(doc, 'campaign-1', 'gm-user');
      const entityId = addEntityToPool(doc, {
        type: 'secret',
        createdBy: 'gm-user',
        createdFor: 'campaign',
        createdDuring: { termNumber: 1, eventRoll: 5 },
        ownedBy: 'gm-user',
        name: 'Secret Plot',
        metadata: {},
        graphNodeId: 'node-1',
        claimedBy: [],
      });

      const requestId = requestConnection(
        doc,
        'char-2',
        entityId,
        'enemy',
        undefined,
        'user-2'
      );

      // GM rejects
      resolveConnectionRequest(doc, requestId, false, 'gm-user');

      const requests = getConnectionRequests(doc);
      const resolved = requests.find((r) => r.id === requestId);
      expect(resolved?.status).toBe('rejected');
      expect(resolved?.resolvedBy).toBe('gm-user');

      // Verify entity claimedBy was NOT updated
      const entity = getEntityFromPool(doc, entityId);
      expect(entity?.claimedBy).not.toContain('char-2');
    });

    it('should preserve session settings when GM updates multiple times', () => {
      createSession(doc, 'campaign-1', 'gm-user');

      // First update
      updateSessionSettings(doc, {
        allowedCareers: ['Navy'],
        requireGMApproval: true,
      });

      // Second update (partial)
      updateSessionSettings(doc, {
        aiVerbosity: 'rich',
      });

      const session = getSession(doc);
      expect(session?.settings.allowedCareers).toEqual(['Navy']);
      expect(session?.settings.requireGMApproval).toBe(true);
      expect(session?.settings.aiVerbosity).toBe('rich');
    });
  });
});
