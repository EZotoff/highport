import React, { useEffect, useMemo, useState } from 'react';
import { GraphNode, NodeType } from '@highport/shared';
import { SciFiButton, SciFiDialog, SciFiInput, SciFiSelect } from '@/components/ui/scifi';
import { ThemeColor } from '@/lib/design-system/types';
import { THEME_HEX } from '@/lib/design-system/themeUtils';
import { getNodeConfig } from './nodes/node-config';
import { getYDoc } from '../../lib/ydoc';
import { updateNodeLabel, updateNodeMetadata, updateNodeType } from '../../lib/yjs-helpers';

interface NodeEditDialogProps {
  open: boolean;
  onClose: () => void;
  node: GraphNode;
}

const NODE_TYPE_OPTIONS: Array<{ value: NodeType; label: string }> = [
  { value: 'traveller', label: 'Traveller' },
  { value: 'npc', label: 'NPC' },
  { value: 'spacecraft', label: 'Spacecraft' },
  { value: 'world', label: 'World' },
  { value: 'faction', label: 'Faction' },
  { value: 'location', label: 'Location' },
  { value: 'event', label: 'Event' },
  { value: 'clue', label: 'Clue' },
  { value: 'sector', label: 'Sector' },
];

const THEME_BY_HEX: Record<string, ThemeColor> = {
  [THEME_HEX.cyan]: 'cyan',
  [THEME_HEX.violet]: 'violet',
  [THEME_HEX.amber]: 'amber',
  [THEME_HEX.emerald]: 'emerald',
  [THEME_HEX.red]: 'red',
  [THEME_HEX.slate]: 'slate',
};

export function NodeEditDialog({ open, onClose, node }: NodeEditDialogProps) {
  const [label, setLabel] = useState(node.label);
  const [description, setDescription] = useState(node.metadata.description ?? '');
  const [type, setType] = useState<NodeType>(node.type);
  const [tagsInput, setTagsInput] = useState((node.metadata.tags ?? []).join(', '));

  useEffect(() => {
    setLabel(node.label);
    setDescription(node.metadata.description ?? '');
    setType(node.type);
    setTagsInput((node.metadata.tags ?? []).join(', '));
  }, [node]);

  const theme = useMemo<ThemeColor>(() => {
    const themeHex = getNodeConfig(type).themeHex;
    return THEME_BY_HEX[themeHex] ?? 'cyan';
  }, [type]);

  const nodeTypeOptions = useMemo(() => {
    const baseOptions = NODE_TYPE_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    }));
    if (type.startsWith('custom:')) {
      return [{ value: type, label: `Custom (${type.slice(7)})` }, ...baseOptions];
    }
    return baseOptions;
  }, [type]);

  const handleSave = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const doc = getYDoc();
    updateNodeLabel(doc, node.id, trimmedLabel);
    updateNodeType(doc, node.id, type);
    updateNodeMetadata(doc, node.id, {
      description: description.trim(),
      tags,
    });

    onClose();
  };

  return (
    <SciFiDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Edit Node"
      description="Tune identity, class, and metadata for this graph entity."
      theme={theme}
      className="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <SciFiButton type="button" onClick={onClose} scifiVariant="outline" theme={theme}>
            Cancel
          </SciFiButton>
          <SciFiButton type="button" onClick={handleSave} scifiVariant="primary" theme={theme} glow>
            Save
          </SciFiButton>
        </div>
      }
    >
      <div className="grid gap-4">
        <SciFiInput
          label="Label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Node name"
          theme={theme}
        />

        <div className="space-y-1.5">
          <label
            className="text-xs font-bold uppercase tracking-wider text-[var(--text-label)] ml-1"
            htmlFor="node-type"
          >
            Type
          </label>
          <SciFiSelect
            id="node-type"
            value={type}
            onValueChange={(value) => setType(value as NodeType)}
            options={nodeTypeOptions}
            placeholder="Select node type"
            theme={theme}
          />
        </div>

        <div className="w-full space-y-1.5">
          <label
            className="text-xs font-bold uppercase tracking-wider text-[var(--text-label)] ml-1"
            htmlFor="node-description"
          >
            Description
          </label>
          <textarea
            id="node-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Node description"
            className="w-full resize-y rounded-lg border border-[var(--asteroid-dust-50)] bg-[var(--star-metal)] px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            style={{
              borderColor: `${THEME_HEX[theme]}50`,
              boxShadow: `inset 0 0 0 1px ${THEME_HEX[theme]}20`,
            }}
          />
        </div>

        <SciFiInput
          label="Tags"
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="pirates, drinax, political"
          theme={theme}
        />
      </div>
    </SciFiDialog>
  );
}
