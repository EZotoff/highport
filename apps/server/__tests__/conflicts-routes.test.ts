import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerConflictRoutes } from '../src/routes/conflicts.js';

function getTableName(table: unknown): string {
  if (!table || typeof table !== 'object') return '';
  const tableObj = table as Record<string | symbol, unknown>;
  for (const key of Object.getOwnPropertySymbols(tableObj)) {
    const val = tableObj[key];
    if (val && typeof val === 'object' && 'name' in val) {
      return (val as { name: string }).name;
    }
  }
  if ('_' in tableObj && tableObj._ && typeof tableObj._ === 'object' && 'name' in tableObj._) {
    return (tableObj._ as { name: string }).name;
  }
  return '';
}

const mockConflict = {
  id: 'conflict_123',
  nodeId: 'node_abc',
  fieldPath: 'notes',
  foundryValue: 'foundry value',
  planeshiftValue: 'planeshift value',
  foundryTimestamp: new Date('2025-01-01T10:00:00Z'),
  planeshiftTimestamp: new Date('2025-01-01T09:00:00Z'),
  status: 'pending',
  resolution: null,
  resolvedBy: null,
  resolvedAt: null,
  createdAt: new Date('2025-01-01T08:00:00Z'),
};

let mockConflicts: typeof mockConflict[] = [];

vi.mock('../src/db/client.js', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        const tableName = getTableName(table);
        if (tableName === 'conflict_queue') {
          return {
            where: vi.fn(() => Promise.resolve(mockConflicts.filter(c => c.status === 'pending'))),
          };
        }
        return { where: vi.fn(() => Promise.resolve([])) };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock('../src/db/schema.js', () => {
  const createMockTable = (name: string) => {
    const table = { id: 'id', status: 'status' };
    Object.defineProperty(table, Symbol.for('drizzle:Name'), {
      value: { name },
      enumerable: false,
    });
    return table;
  };

  return {
    conflictQueue: createMockTable('conflict_queue'),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => 'eq-mock'),
}));

describe('Conflict Routes', () => {
  let fastify: FastifyInstance;

  beforeAll(async () => {
    fastify = Fastify();
    await registerConflictRoutes(fastify);
    await fastify.ready();
  });

  afterAll(async () => {
    await fastify.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockConflicts = [{ ...mockConflict }];
  });

  describe('GET /api/conflicts', () => {
    it('returns 403 for non-GM', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/conflicts',
        headers: { 'x-is-gm': 'false' },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json().error).toContain('GM');
    });

    it('returns pending conflicts for GM', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/conflicts',
        headers: { 'x-is-gm': 'true' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.conflicts).toHaveLength(1);
      expect(data.conflicts[0].id).toBe('conflict_123');
    });
  });

  describe('GET /api/conflicts/:id', () => {
    it('returns 404 for non-existent conflict', async () => {
      mockConflicts = [];

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/conflicts/conflict_nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns conflict by id', async () => {
      const { db } = await import('../src/db/client.js');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockConflict])),
        })),
      } as unknown as ReturnType<typeof db.select>);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/conflicts/conflict_123',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.id).toBe('conflict_123');
      expect(data.fieldPath).toBe('notes');
    });
  });

  describe('POST /api/conflicts/:id/resolve', () => {
    it('returns 403 for non-GM', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/conflicts/conflict_123/resolve',
        headers: { 'x-is-gm': 'false' },
        payload: { resolution: 'keep_foundry' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('returns 400 for invalid resolution', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/conflicts/conflict_123/resolve',
        headers: { 'x-is-gm': 'true', 'x-user-id': 'user_gm' },
        payload: { resolution: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('Invalid');
    });

    it('resolves conflict with valid resolution', async () => {
      const { db } = await import('../src/db/client.js');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockConflict])),
        })),
      } as unknown as ReturnType<typeof db.select>);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/conflicts/conflict_123/resolve',
        headers: { 'x-is-gm': 'true', 'x-user-id': 'user_gm' },
        payload: { resolution: 'keep_foundry' },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.status).toBe('resolved');
      expect(data.resolution).toBe('keep_foundry');
    });
  });

  describe('DELETE /api/conflicts/:id', () => {
    it('returns 403 for non-GM', async () => {
      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/conflicts/conflict_123',
        headers: { 'x-is-gm': 'false' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('dismisses conflict for GM', async () => {
      const { db } = await import('../src/db/client.js');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([mockConflict])),
        })),
      } as unknown as ReturnType<typeof db.select>);

      const response = await fastify.inject({
        method: 'DELETE',
        url: '/api/conflicts/conflict_123',
        headers: { 'x-is-gm': 'true', 'x-user-id': 'user_gm' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('dismissed');
    });
  });
});
