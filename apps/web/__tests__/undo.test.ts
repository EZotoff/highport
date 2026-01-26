import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { getYDoc } from '../lib/ydoc';
import { initUndoManager, undo, redo } from '../lib/undo';
import { addNode } from '../lib/yjs-helpers';
import { GraphNode } from '@planeshift/shared';

describe('UndoManager', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = getYDoc();
    doc.getMap('nodes').clear();
    doc.getMap('edges').clear();
    initUndoManager();
  });

  it('should undo and redo node addition', () => {
    const node: GraphNode = {
      id: 'test-node-undo',
      type: 'traveller',
      label: 'Test Node',
      position: { x: 0, y: 0 },
      metadata: {},
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: 'test',
    };

    addNode(doc, node);
    expect(doc.getMap('nodes').size).toBe(1);

    undo();
    expect(doc.getMap('nodes').size).toBe(0);

    redo();
    expect(doc.getMap('nodes').size).toBe(1);
  });
});
