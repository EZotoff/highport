import React, { memo, useCallback } from 'react';
import { useStore, useReactFlow } from '@xyflow/react';
import { PresenceState } from '../../lib/awareness';

interface CursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
}

const Cursor = memo(({ x, y, color, name }: CursorProps) => {
  const { flowToScreenPosition } = useReactFlow();
  const screenPos = flowToScreenPosition({ x, y });

  return (
    <div
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        pointerEvents: 'none',
        zIndex: 1000,
        transition: 'all 0.1s ease',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color }}
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L11.7841 12.3673H5.65376Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className="px-2 py-0.5 rounded text-white text-xs font-bold shadow-sm whitespace-nowrap"
        style={{
          position: 'absolute',
          top: 16,
          left: 12,
          backgroundColor: color,
        }}
      >
        {name}
      </div>
    </div>
  );
});

Cursor.displayName = 'Cursor';

export const CursorOverlay = ({ cursors }: { cursors: PresenceState[] }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {cursors.map((c) => 
        c.cursor ? (
          <Cursor 
            key={c.userId} 
            x={c.cursor.x} 
            y={c.cursor.y} 
            color={c.color} 
            name={c.name} 
          />
        ) : null
      )}
    </div>
  );
};

const Halo = memo(({ nodeId, color }: { nodeId: string, color: string }) => {
  const nodeSelector = useCallback((state: any) => state.nodeLookup.get(nodeId), [nodeId]);
  const transformSelector = useCallback((state: any) => state.transform, []);
  
  const node = useStore(nodeSelector);
  const transform = useStore(transformSelector);
  const { flowToScreenPosition } = useReactFlow();

  if (!node) return null;

  const screenPos = flowToScreenPosition(node.position);
  const width = node.measured?.width ?? node.width ?? 150;
  const height = node.measured?.height ?? node.height ?? 40;
  const scale = transform[2];

  return (
    <div
      style={{
        position: 'absolute',
        left: screenPos.x,
        top: screenPos.y,
        width: width * scale,
        height: height * scale,
        border: `2px solid ${color}`,
        borderRadius: '6px',
        pointerEvents: 'none',
        zIndex: 40,
        boxShadow: `0 0 0 4px ${color}20`,
        transition: 'all 0.1s ease',
      }}
    />
  );
});

Halo.displayName = 'Halo';

export const SelectionHalos = ({ users }: { users: PresenceState[] }) => {
  return (
    <>
      {users.map(user => 
        user.selectedNodeId ? (
          <Halo key={`halo-${user.userId}`} nodeId={user.selectedNodeId} color={user.color} />
        ) : null
      )}
    </>
  );
};

export const UserList = ({ users, currentUserId }: { users: PresenceState[], currentUserId: string }) => {
  return (
    <div className="flex -space-x-2 items-center pointer-events-auto bg-white/50 backdrop-blur-sm p-1 rounded-full border border-gray-200/50 shadow-sm hover:bg-white/80 transition-colors">
      {users.map((user) => (
         <div
           key={user.userId}
           className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white ring-1 ring-gray-200 shadow-sm ${
             user.userId === currentUserId ? 'z-20' : 'z-10'
           }`}
           style={{ backgroundColor: user.color }}
           title={user.name}
         >
           {user.name.charAt(0).toUpperCase()}
         </div>
      ))}
      {users.length > 0 && (
         <div className="ml-3 px-2 py-1 text-xs font-medium text-gray-500">
            {users.length} active
         </div>
      )}
    </div>
  );
};
