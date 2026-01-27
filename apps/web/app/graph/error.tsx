'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GraphError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-4 text-zinc-100">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-lg border border-red-900/50 bg-red-950/30 p-6 text-center backdrop-blur-sm">
        <div className="rounded-full bg-red-900/20 p-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        
        <h2 className="text-lg font-semibold text-red-100">
          Failed to load graph
        </h2>
        
        <p className="text-sm text-zinc-400">
          {error.message || "We encountered an error while loading the campaign graph."}
        </p>

        <button
          onClick={() => reset()}
          className="mt-2 flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  );
}
