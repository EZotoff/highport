'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConflictItem {
  id: string;
  nodeId: string;
  fieldPath: string;
  foundryValue: unknown;
  highportValue: unknown;
  foundryTimestamp: string;
  highportTimestamp: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3012';

export function ConflictQueue() {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/conflicts`);
      const data = await res.json();
      setConflicts(data.conflicts || []);
      setError(null);
    } catch (err) {
      setError('Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleResolve = async (id: string, resolution: 'keep_foundry' | 'keep_highport') => {
    try {
      await fetch(`${SERVER_URL}/api/conflicts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, resolvedBy: 'gm' }),
      });
      setConflicts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError('Failed to resolve conflict');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/conflicts/${id}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedBy: 'gm' }),
      });
      setConflicts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError('Failed to dismiss conflict');
    }
  };

  if (loading) return <div className="p-4">Loading conflicts...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (conflicts.length === 0) return <div className="p-4 text-gray-500">No pending conflicts</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Conflict Queue ({conflicts.length})</h2>
      {conflicts.map(conflict => (
        <div key={conflict.id} className="border rounded-lg p-4 bg-white shadow">
          <div className="font-medium text-lg">{conflict.fieldPath}</div>
          <div className="text-sm text-gray-500">Node: {conflict.nodeId}</div>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm font-medium text-blue-700">Foundry Value</div>
              <pre className="text-sm mt-1 overflow-auto">{JSON.stringify(conflict.foundryValue, null, 2)}</pre>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(conflict.foundryTimestamp).toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-sm font-medium text-green-700">Highport Value</div>
              <pre className="text-sm mt-1 overflow-auto">{JSON.stringify(conflict.highportValue, null, 2)}</pre>
              <div className="text-xs text-gray-400 mt-2">
                {new Date(conflict.highportTimestamp).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => handleResolve(conflict.id, 'keep_foundry')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Keep Foundry
            </button>
            <button
              onClick={() => handleResolve(conflict.id, 'keep_highport')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Keep Highport
            </button>
            <button
              onClick={() => handleDismiss(conflict.id)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
