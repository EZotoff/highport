import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { getNodeConfig } from './node-config';
import { Lock, EyeOff } from 'lucide-react';

const BaseNode = memo(({ data, selected, type }: NodeProps) => {
  const config = getNodeConfig(type);
  const description = data.description as string | undefined;
  const isLocked = data.locked as boolean;
  const isHidden = data.hidden as boolean;

  const Icon = config.icon;

  return (
    <div
      className={`relative px-4 py-3 shadow-md rounded-lg bg-white border-2 transition-all min-w-[180px] group ${
        selected ? config.borderColor : 'border-gray-200 hover:border-gray-300'
      } ${isHidden ? 'opacity-60 border-dashed' : ''} ${isLocked ? 'cursor-not-allowed' : ''}`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white transition-colors group-hover:!bg-gray-600" 
      />
      
      <div className="flex items-start gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full text-xl shrink-0 ${config.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex flex-col min-w-0">
          <div className="font-bold text-sm text-gray-800 leading-tight break-words">{data.label as string}</div>
          {description && (
            <div className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">{description}</div>
          )}
        </div>
      </div>

      <div className="absolute -top-2 -right-2 flex gap-1 pointer-events-none">
        {isLocked && (
          <div className="bg-gray-100 p-1 rounded-full border border-gray-200 shadow-sm text-xs">
            <Lock className="w-3 h-3 text-gray-500" />
          </div>
        )}
        {isHidden && (
          <div className="bg-gray-100 p-1 rounded-full border border-gray-200 shadow-sm text-xs">
            <EyeOff className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white transition-colors group-hover:!bg-gray-600" 
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';

export default BaseNode;
