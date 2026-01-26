import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { getRandomColor, initAwareness, updateCursor, updateSelection, PresenceState } from '../lib/awareness';

describe('Awareness', () => {
  it('getRandomColor returns a valid hex color', () => {
    const color = getRandomColor();
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('initAwareness sets initial state', () => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    const userId = 'user1';
    const name = 'Alice';

    initAwareness(awareness, userId, name);

    const state = awareness.getLocalState() as PresenceState;
    expect(state).toBeDefined();
    expect(state.userId).toBe(userId);
    expect(state.name).toBe(name);
    expect(state.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(state.cursor).toBeNull();
    expect(state.selectedNodeId).toBeNull();
  });

  it('updateCursor updates cursor position', () => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    initAwareness(awareness, 'user1', 'Alice');

    const position = { x: 100, y: 200 };
    updateCursor(awareness, position);

    const state = awareness.getLocalState() as PresenceState;
    expect(state.cursor).toEqual(position);
  });

  it('updateSelection updates selected node', () => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    initAwareness(awareness, 'user1', 'Alice');

    const nodeId = 'node-123';
    updateSelection(awareness, nodeId);

    const state = awareness.getLocalState() as PresenceState;
    expect(state.selectedNodeId).toBe(nodeId);
  });
});
