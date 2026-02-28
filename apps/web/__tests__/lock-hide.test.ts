import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { getYDoc, getNodesMap } from '../lib/ydoc';
import { addNode, updateNodeLock, updateNodeVisibility } from '../lib/yjs-helpers';
import { GraphNode } from '@highport/shared/types/graph';

describe('Yjs Helpers Lock/Hide', () => {
  let doc: Y.Doc;
  const nodeId = 'test-node-lock';

  beforeEach(() => {
    doc = getYDoc();
    doc.getMap('nodes').clear();
    const node: GraphNode = {
      id: nodeId,
      type: 'traveller',
      label: 'Test Node',
      position: { x: 0, y: 0 },
      metadata: { description: 'test' },
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: 'test',
    };
    addNode(doc, node);
  });

  it('should update lock status', () => {
    updateNodeLock(doc, nodeId, true);
    const nodes = getNodesMap(doc);
    const ymap = nodes.get(nodeId);
    expect(ymap?.get('locked')).toBe(true);
  });

  it('should update visibility', () => {
    updateNodeVisibility(doc, nodeId, true);
    const nodes = getNodesMap(doc);
    const ymap = nodes.get(nodeId);
    expect(ymap?.get('hidden')).toBe(true);
  });
});
