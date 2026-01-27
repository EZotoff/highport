'use client';

import React from 'react';
import { CheckCircle, XCircle, GitMerge } from 'lucide-react';

interface ConflictData {
  id: string;
  nodeId: string;
  fieldPath: string;
  foundryValue: unknown;
  planeshiftValue: unknown;
  foundryTimestamp: string | null;
  planeshiftTimestamp: string | null;
  createdAt: string | null;
}

interface ConflictCardProps {
  conflict: ConflictData;
  onResolve: (id: string, resolution: 'keep_foundry' | 'keep_planeshift') => void;
  onDismiss: (id: string) => void;
  isLoading?: boolean;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'string') return value.length > 100 ? value.slice(0, 100) + '...' : value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return 'Unknown';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function ConflictCard({ conflict, onResolve, onDismiss, isLoading }: ConflictCardProps) {
  return (
    <div className="bg-zinc-900/80 border border-amber-800/50 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-amber-400 font-mono text-sm">{conflict.fieldPath}</h3>
          <p className="text-zinc-500 text-xs mt-1">Node: {conflict.nodeId}</p>
        </div>
        <span className="text-xs text-zinc-600">
          {formatTimestamp(conflict.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-950/30 border border-blue-800/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-400 text-xs font-semibold uppercase">Foundry</span>
            <span className="text-zinc-600 text-xs">{formatTimestamp(conflict.foundryTimestamp)}</span>
          </div>
          <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono overflow-auto max-h-32">
            {formatValue(conflict.foundryValue)}
          </pre>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400 text-xs font-semibold uppercase">PlaneShift</span>
            <span className="text-zinc-600 text-xs">{formatTimestamp(conflict.planeshiftTimestamp)}</span>
          </div>
          <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-mono overflow-auto max-h-32">
            {formatValue(conflict.planeshiftValue)}
          </pre>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-zinc-800">
        <button
          onClick={() => onResolve(conflict.id, 'keep_foundry')}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 rounded text-sm transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} />
          Keep Foundry
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'keep_planeshift')}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300 rounded text-sm transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} />
          Keep PlaneShift
        </button>
        <button
          onClick={() => onDismiss(conflict.id)}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-sm transition-colors disabled:opacity-50 ml-auto"
        >
          <XCircle size={14} />
          Dismiss
        </button>
      </div>
    </div>
  );
}
