import React, { useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLock: () => void;
  onHide: () => void;
  isLocked: boolean;
  isHidden: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
  onLock,
  onHide,
  isLocked,
  isHidden,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
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
      className="absolute z-50 min-w-[160px] bg-white rounded-md shadow-xl border border-gray-200 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex flex-col py-1">
        <button
          onClick={onEdit}
          className="text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 w-full text-gray-700"
        >
          <span className="w-4">✏️</span> Edit
        </button>
        <button
          onClick={onLock}
          className="text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 w-full text-gray-700"
        >
          <span className="w-4">{isLocked ? '🔓' : '🔒'}</span> {isLocked ? 'Unlock' : 'Lock'}
        </button>
        <button
          onClick={onHide}
          className="text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 w-full text-gray-700"
        >
          <span className="w-4">{isHidden ? '👁️' : '🚫'}</span> {isHidden ? 'Show' : 'Hide'}
        </button>
        <div className="h-px bg-gray-200 my-1" />
        <button
          onClick={onDelete}
          className="text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 w-full"
        >
          <span className="w-4">🗑️</span> Delete
        </button>
      </div>
    </div>
  );
};
