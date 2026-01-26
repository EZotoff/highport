import * as Y from 'yjs';
import { getYDoc, getNodesMap, getEdgesMap } from './ydoc';

let undoManager: Y.UndoManager | null = null;

export function initUndoManager(): Y.UndoManager {
  if (undoManager) return undoManager;
  
  const doc = getYDoc();
  const nodes = getNodesMap(doc);
  const edges = getEdgesMap(doc);
  
  undoManager = new Y.UndoManager([nodes, edges], {
    captureTimeout: 500,
  });
  
  return undoManager;
}

export function undo() {
  undoManager?.undo();
}

export function redo() {
  undoManager?.redo();
}

export function getUndoManager() {
  return undoManager;
}

export function resetUndoManager() {
  undoManager = null;
}
