'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ui/ToastContext';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import * as Y from 'yjs';
import { Plus, Link as LinkIcon, Unlink, ExternalLink, AlertTriangle } from 'lucide-react';
import { getYDoc, getNodesMap } from '../../lib/ydoc';
import {
  Faction,
  getReputationMap,
  addFaction,
  updateFactionField,
  yMapToFaction,
  getStandingColor,
} from '../../lib/reputation-state';

// Simple editable cell component
const EditableCell = ({
  value,
  onChange,
  type = 'text',
  min,
  max,
  className = '',
  onClick,
  isLink = false,
}: {
  value: string | number;
  onChange: (val: string | number) => void;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  className?: string;
  onClick?: () => void;
  isLink?: boolean;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val: string | number = e.target.value;
    if (type === 'number') {
      val = Number(val);
      if (min !== undefined && val < min) val = min;
      if (max !== undefined && val > max) val = max;
    }
    setLocalValue(val);
  };

  if (!isEditing && isLink) {
    return (
      <div className="flex items-center gap-2 group cursor-pointer" onClick={onClick}>
        <span className={`${className} hover:underline`}>{value}</span>
        <ExternalLink
          size={12}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400"
        />
      </div>
    );
  }

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsEditing(true)}
      className={`w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 ${className}`}
    />
  );
};

export function ReputationTable() {
  const [data, setData] = useState<Faction[]>([]);
  const [nodes, setNodes] = useState<{ id: string; label: string }[]>([]);
  const [isNodePickerOpen, setIsNodePickerOpen] = useState<string | null>(null); // factionId
  const router = useRouter();
  const { showToast } = useToast();

  // Initialize Data
  useEffect(() => {
    const doc = getYDoc();
    const factionsMap = getReputationMap(doc);
    const nodesMap = getNodesMap(doc);

    const updateData = () => {
      const factions: Faction[] = [];
      factionsMap.forEach((map: any) => {
        factions.push(yMapToFaction(map));
      });
      // Sort by name
      factions.sort((a, b) => a.name.localeCompare(b.name));
      setData(factions);
    };

    const updateNodes = () => {
      const nodeList: { id: string; label: string }[] = [];
      nodesMap.forEach((map: any) => {
        nodeList.push({
          id: map.get('id'),
          label: map.get('label') || 'Unnamed Node',
        });
      });
      setNodes(nodeList.sort((a, b) => a.label.localeCompare(b.label)));
    };

    updateData();
    updateNodes();

    const observer = () => {
      updateData();
    };

    const nodesObserver = () => {
      updateNodes();
    };

    factionsMap.observeDeep(observer);
    nodesMap.observeDeep(nodesObserver);

    return () => {
      factionsMap.unobserveDeep(observer);
      nodesMap.unobserveDeep(nodesObserver);
    };
  }, []);

  const handleUpdate = useCallback((id: string, field: string, value: any) => {
    const doc = getYDoc();
    updateFactionField(doc, id, field, value);
  }, []);

  const handleAddFaction = useCallback(() => {
    const doc = getYDoc();
    addFaction(doc, 'New Faction');
  }, []);

  const handleLinkNode = useCallback((factionId: string, nodeId: string | null) => {
    const doc = getYDoc();
    updateFactionField(doc, factionId, 'factionNodeId', nodeId);
    setIsNodePickerOpen(null);
  }, []);

  const handleNameClick = useCallback(
    (faction: Faction) => {
      if (faction.factionNodeId) {
        // Check if node exists
        const nodeExists = nodes.some((n) => n.id === faction.factionNodeId);
        if (nodeExists) {
          router.push(`/graph?focusNode=${faction.factionNodeId}`);
        } else {
          showToast('Linked node not found in graph', 'warning');
        }
      } else {
        showToast('This faction is not linked to any graph node', 'info');
      }
    },
    [nodes, router, showToast],
  );

  const columns = useMemo<ColumnDef<Faction>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Faction Name',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(val) => handleUpdate(row.original.id, 'name', val)}
            className="font-medium text-zinc-200"
            isLink={!!row.original.factionNodeId}
            onClick={() => handleNameClick(row.original)}
          />
        ),
      },
      {
        accessorKey: 'standing',
        header: 'Standing',
        cell: ({ row, getValue }) => {
          const val = getValue() as number;
          const color = getStandingColor(val);
          return (
            <div
              className="rounded px-2 py-1 text-center font-bold text-black shadow-sm"
              style={{ backgroundColor: color }}
            >
              <EditableCell
                value={val}
                type="number"
                min={-100}
                max={100}
                onChange={(v) => handleUpdate(row.original.id, 'standing', v)}
                className="text-center font-bold text-black placeholder-black/50 bg-transparent"
              />
            </div>
          );
        },
      },
      {
        accessorKey: 'tier',
        header: 'Tier',
        cell: ({ getValue }) => (
          <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-sm border border-zinc-700">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'heat',
        header: 'Heat',
        cell: ({ row, getValue }) => (
          <div className="flex items-center gap-2">
            <EditableCell
              value={getValue() as number}
              type="number"
              min={0}
              max={100}
              onChange={(val) => handleUpdate(row.original.id, 'heat', val)}
              className="w-16 text-right"
            />
            <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${getValue() as number}%` }} />
            </div>
          </div>
        ),
      },
      {
        id: 'link',
        header: 'Graph Link',
        cell: ({ row }) => {
          const faction = row.original;
          const linkedNode = nodes.find((n) => n.id === faction.factionNodeId);
          const isMissing = faction.factionNodeId && !linkedNode;

          return (
            <div className="relative">
              {isNodePickerOpen === faction.id ? (
                <div className="absolute z-10 top-0 left-0 w-64 bg-zinc-800 border border-zinc-700 rounded shadow-lg p-2">
                  <div className="mb-2 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                    Select Node
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    <button
                      onClick={() => handleLinkNode(faction.id, null)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-zinc-700 text-red-400 text-sm flex items-center gap-2"
                    >
                      <Unlink size={14} /> Unlink
                    </button>
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleLinkNode(faction.id, node.id)}
                        className="w-full text-left px-2 py-1 rounded hover:bg-zinc-700 text-zinc-200 text-sm truncate"
                      >
                        {node.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setIsNodePickerOpen(null)}
                    className="mt-2 w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsNodePickerOpen(faction.id)}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm transition-colors ${
                    isMissing
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50'
                      : linkedNode
                        ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-800/50'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                  }`}
                >
                  {isMissing ? <AlertTriangle size={14} /> : <LinkIcon size={14} />}
                  {isMissing ? 'Missing Node' : linkedNode ? linkedNode.label : 'Link Node'}
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [handleUpdate, nodes, isNodePickerOpen, handleLinkNode, handleNameClick],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-zinc-100">Factions & Reputation</h2>
        <button
          onClick={handleAddFaction}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 transition-colors"
        >
          <Plus size={16} /> Add Faction
        </button>
      </div>

      <div className="overflow-x-visible pb-32">
        {' '}
        {/* Allow popup to overflow */}
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-zinc-200 uppercase">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-600">
                  No factions defined.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-800/30 transition-colors group">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
