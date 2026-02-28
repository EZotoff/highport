'use client';

import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, FileJson } from 'lucide-react';
import type { GraphNode } from '@highport/shared/types/graph';
import {
  parseFoundryActors,
  matchActorsToNodes,
  type ImportResult,
} from '@/lib/foundry-import';
import { exportNodesToZip } from '@/lib/foundry-export';

interface ImportExportProps {
  nodes: GraphNode[];
  onImportApply?: (
    matches: ImportResult['matched']
  ) => void;
}

export function ImportExport({ nodes, onImportApply }: ImportExportProps) {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const text = await file.text();
      const actors = parseFoundryActors(text);
      const result = matchActorsToNodes(actors, nodes);
      setImportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyImport = () => {
    if (importResult && onImportApply) {
      onImportApply(importResult.matched);
      setImportResult(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);

    try {
      const blob = await exportNodesToZip(nodes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'highport-export.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const travellerNodeCount = nodes.filter((n) => n.type === 'traveller').length;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-blue-400" size={20} />
          <h3 className="text-zinc-100 font-semibold">Import from Foundry</h3>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Upload actors.json exported from Foundry VTT. Actors will be matched
          to existing nodes by UUID or name.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          id="foundry-import"
        />
        <label
          htmlFor="foundry-import"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 rounded cursor-pointer transition-colors"
        >
          <FileJson size={16} />
          {importing ? 'Processing...' : 'Select JSON File'}
        </label>

        {importResult && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle size={14} />
                {importResult.matched.length} matched
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle size={14} />
                {importResult.unmatched.length} unmatched
              </span>
            </div>

            {importResult.matched.length > 0 && (
              <div className="bg-emerald-950/30 border border-emerald-800/30 rounded p-3">
                <h4 className="text-emerald-400 text-xs font-semibold uppercase mb-2">
                  Matched Actors
                </h4>
                <ul className="text-zinc-300 text-sm space-y-1 max-h-32 overflow-auto">
                  {importResult.matched.map((m) => (
                    <li key={m.actorId} className="flex justify-between">
                      <span>{m.actorName}</span>
                      <span className="text-zinc-500">→ {m.nodeId}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {importResult.unmatched.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-800/30 rounded p-3">
                <h4 className="text-amber-400 text-xs font-semibold uppercase mb-2">
                  Unmatched Actors (will not be imported)
                </h4>
                <ul className="text-zinc-400 text-sm space-y-1 max-h-32 overflow-auto">
                  {importResult.unmatched.map((u) => (
                    <li key={u.actorId}>{u.actorName}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApplyImport}
                disabled={importResult.matched.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} />
                Apply {importResult.matched.length} Changes
              </button>
              <button
                onClick={() => setImportResult(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center gap-3 mb-4">
          <Download className="text-emerald-400" size={20} />
          <h3 className="text-zinc-100 font-semibold">Export to Foundry</h3>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Export {travellerNodeCount} traveller node
          {travellerNodeCount !== 1 ? 's' : ''} as Foundry-compatible JSON files
          in a ZIP archive.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting || travellerNodeCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          {exporting ? 'Generating...' : 'Download ZIP'}
        </button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
