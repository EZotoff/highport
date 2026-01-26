import * as Y from 'yjs';

let ydoc: Y.Doc | null = null;

export function createYDoc(): Y.Doc {
  return new Y.Doc();
}

export function getYDoc(): Y.Doc {
  if (!ydoc) {
    ydoc = createYDoc();
  }
  return ydoc;
}

export function resetYDoc(): void {
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }
}

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('nodes') as Y.Map<Y.Map<unknown>>;
}

export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('edges') as Y.Map<Y.Map<unknown>>;
}
