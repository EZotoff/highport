
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  Row,
} from '@tanstack/react-table';
import * as Y from 'yjs';
import { Download, Plus, History, Trash2 } from 'lucide-react';
import {
  Resource,
  getResourcesMap,
  initBaseResources,
  addResource,
  updateResource,
  resourceFromMap,
  deleteResource
} from '../../lib/base-state';
import { getYDoc } from '../../lib/ydoc';
import { getOrCreateUser } from '../../lib/identity';
import { CellHistory } from './CellHistory';

// Simple editable cell component
const EditableCell = ({
  value,
  onChange,
  type = 'text',
  onContextMenu
}: {
  value: string | number;
  onChange: (val: string | number) => void;
  type?: 'text' | 'number';
  onContextMenu?: (e: React.MouseEvent) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type={type}
      value={localValue === null ? '' : localValue}
      onChange={(e) => setLocalValue(type === 'number' ? Number(e.target.value) : e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1"
    />
  );
};

export function BaseResources() {
  const [data, setData] = useState<Resource[]>([]);
  const [user, setUser] = useState<{ userId: string; name: string } | null>(null);
  const [historyView, setHistoryView] = useState<{ resourceId: string; history: any[]; name: string } | null>(null);

  // Initialize User
  useEffect(() => {
    const u = getOrCreateUser();
    setUser({ userId: u.userId, name: u.name });
  }, []);

  // Initialize Yjs and Data
  useEffect(() => {
    const doc = getYDoc();
    initBaseResources(doc);
    const resourcesMap = getResourcesMap(doc);

    const updateData = () => {
      const resources: Resource[] = [];
      resourcesMap.forEach((map: any) => {
        resources.push(resourceFromMap(map));
      });
      // Sort by creation or name to keep order stable? 
      // For now, sorting by name or just letting them be. 
      // Map iteration order is insertion order in Yjs usually.
      setData(resources);
    };

    updateData();

    const observer = () => {
      requestAnimationFrame(updateData);
    };

    resourcesMap.observeDeep(observer);

    return () => {
      resourcesMap.unobserveDeep(observer);
    };
  }, []);

  const handleUpdate = useCallback((id: string, field: keyof Resource, value: any) => {
    if (!user) return;
    const doc = getYDoc();
    updateResource(doc, id, { [field]: value }, user.userId);
  }, [user]);

  const handleAddResource = useCallback(() => {
    const doc = getYDoc();
    addResource(doc, 'New Resource');
  }, []);

  const handleDeleteResource = useCallback((id: string) => {
      const doc = getYDoc();
      deleteResource(doc, id);
  }, []);

  const handleExportCSV = useCallback(() => {
    const headers = ['Name', 'Current', 'Max', 'Unit'];
    const csvContent = [
      headers.join(','),
      ...data.map(r => 
        `"${r.name}",${r.current},${r.max || ''},"${r.unit}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'resources.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data]);

  const columns = useMemo<ColumnDef<Resource>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Resource Name',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(val) => handleUpdate(row.original.id, 'name', val)}
            onContextMenu={(e) => {
              e.preventDefault();
              setHistoryView({
                resourceId: row.original.id,
                history: row.original.history,
                name: row.original.name
              });
            }}
          />
        ),
      },
      {
        accessorKey: 'current',
        header: 'Current',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue() as number}
            type="number"
            onChange={(val) => handleUpdate(row.original.id, 'current', val)}
             onContextMenu={(e) => {
              e.preventDefault();
              setHistoryView({
                resourceId: row.original.id,
                history: row.original.history,
                name: row.original.name
              });
            }}
          />
        ),
      },
      {
        accessorKey: 'max',
        header: 'Max',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue() as number}
            type="number"
            onChange={(val) => handleUpdate(row.original.id, 'max', val)}
          />
        ),
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        cell: ({ row, getValue }) => (
          <EditableCell
            value={getValue() as string}
            onChange={(val) => handleUpdate(row.original.id, 'unit', val)}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
            <div className="flex justify-end gap-2">
                 <button
                    onClick={() => {
                        setHistoryView({
                            resourceId: row.original.id,
                            history: row.original.history,
                            name: row.original.name
                        });
                    }}
                    className="p-1 hover:text-blue-400 text-zinc-500 transition-colors"
                    title="View History"
                >
                    <History size={16} />
                </button>
                <button
                    onClick={() => handleDeleteResource(row.original.id)}
                    className="p-1 hover:text-red-400 text-zinc-500 transition-colors"
                    title="Delete Resource"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        )
      }
    ],
    [handleUpdate, handleDeleteResource]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-zinc-100">Base Resources</h2>
        <div className="flex gap-2">
          <button
            onClick={handleAddResource}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 transition-colors"
          >
            <Plus size={16} /> Add Resource
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-200 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-800/50 text-zinc-200 uppercase">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.getRowModel().rows.length === 0 ? (
                <tr>
                    <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-600">
                        No resources defined.
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

      {historyView && (
        <CellHistory
          resourceName={historyView.name}
          history={historyView.history}
          onClose={() => setHistoryView(null)}
        />
      )}
    </div>
  );
}
