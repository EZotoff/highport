import React, { useEffect, useRef } from 'react';
import { GraphNode } from '@highport/shared';
import { Edit, Trash2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  node: GraphNode;
  onClose: () => void;
  onAction: (action: 'edit' | 'delete' | 'lock' | 'unlock' | 'hide' | 'unhide') => void;
  isGM: boolean;
}

export function ContextMenu({ x, y, node, onClose, onAction, isGM }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="absolute z-50 min-w-[160px] bg-white rounded-md shadow-lg border border-gray-200 py-1 overflow-hidden animate-in fade-in zoom-in duration-100"
    >
      <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50 truncate max-w-[200px]">
        {node.label}
      </div>

      <button
        onClick={() => onAction('edit')}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Edit className="w-4 h-4" /> Edit
      </button>

      {isGM && (
        <>
          <button
            onClick={() => onAction(node.locked ? 'unlock' : 'lock')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            {node.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {node.locked ? 'Unlock' : 'Lock'}
          </button>

          <button
            onClick={() => onAction(node.hidden ? 'unhide' : 'hide')}
            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            {node.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {node.hidden ? 'Unhide' : 'Hide'}
          </button>
        </>
      )}

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={() => onAction('delete')}
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" /> Delete
      </button>
    </div>
  );
}
