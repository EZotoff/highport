'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ConflictCard } from './ConflictCard';

interface Conflict {
  id: string;
  nodeId: string;
  fieldPath: string;
  foundryValue: unknown;
  planeshiftValue: unknown;
  foundryTimestamp: string | null;
  planeshiftTimestamp: string | null;
  createdAt: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export function ConflictQueue() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/conflicts`, {
        headers: {
          'x-is-gm': 'true',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Only GMs can view conflicts');
          return;
        }
        throw new Error(`Failed to fetch conflicts: ${response.status}`);
      }

      const data = await response.json();
      setConflicts(data.conflicts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleResolve = useCallback(
    async (id: string, resolution: 'keep_foundry' | 'keep_planeshift') => {
      setResolving(id);

      try {
        const response = await fetch(`${API_BASE}/api/conflicts/${id}/resolve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-is-gm': 'true',
            'x-user-id': 'gm_user',
          },
          body: JSON.stringify({ resolution }),
        });

        if (!response.ok) {
          throw new Error(`Failed to resolve conflict: ${response.status}`);
        }

        setConflicts((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to resolve');
      } finally {
        setResolving(null);
      }
    },
    []
  );

  const handleDismiss = useCallback(async (id: string) => {
    setResolving(id);

    try {
      const response = await fetch(`${API_BASE}/api/conflicts/${id}`, {
        method: 'DELETE',
        headers: {
          'x-is-gm': 'true',
          'x-user-id': 'gm_user',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss conflict: ${response.status}`);
      }

      setConflicts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally {
      setResolving(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div className="flex items-center justify-center gap-2 text-zinc-500 py-8">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading conflicts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-500" size={24} />
          <h2 className="text-xl font-bold text-zinc-100">Conflict Queue</h2>
          {conflicts.length > 0 && (
            <span className="bg-amber-900/50 text-amber-400 text-xs font-semibold px-2 py-1 rounded">
              {conflicts.length} pending
            </span>
          )}
        </div>
        <button
          onClick={fetchConflicts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800/50 text-red-400 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {conflicts.length === 0 ? (
        <div className="text-center text-zinc-600 py-12">
          <AlertTriangle className="mx-auto mb-3 opacity-30" size={40} />
          <p>No pending conflicts</p>
          <p className="text-sm mt-1">All sync operations are in harmony</p>
        </div>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={handleResolve}
              onDismiss={handleDismiss}
              isLoading={resolving === conflict.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
