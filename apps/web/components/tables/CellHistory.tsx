import { ResourceChange } from '@/lib/base-state';
import { X } from 'lucide-react';

interface CellHistoryProps {
  history: ResourceChange[];
  resourceName: string;
  onClose: () => void;
}

export function CellHistory({ history, resourceName, onClose }: CellHistoryProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-100">History: {resourceName}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-zinc-500 py-4">No history available</p>
          ) : (
            history
              .slice()
              .reverse()
              .map((change, i) => (
                <div
                  key={i}
                  className="flex justify-between items-start text-sm border-b border-zinc-800/50 pb-2 last:border-0"
                >
                  <div>
                    <div className="font-medium text-zinc-200">Value: {change.value}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(change.changedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">by {change.changedBy}</div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
