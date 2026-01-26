import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

const CustomNode = memo(({ data, selected }: NodeProps) => {
  const description = data.description as string | undefined;
  
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200 transition-colors ${
        selected ? 'border-blue-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-16 !bg-gray-500" />
      <div className="flex flex-col">
        <div className="font-bold text-sm text-gray-700">{data.label as string}</div>
        {description && (
          <div className="text-xs text-gray-500 mt-1">{description}</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-16 !bg-gray-500" />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

export default CustomNode;
