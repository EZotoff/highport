import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

let persistence: IndexeddbPersistence | null = null;

export function initPersistence(doc: Y.Doc, name: string = 'planeshift-graph'): IndexeddbPersistence {
  if (persistence) {
    return persistence;
  }

  persistence = new IndexeddbPersistence(name, doc);

  persistence.on('synced', () => {
    console.log(`[Persistence] Loaded ${name} from IndexedDB`);
  });

  return persistence;
}

export function getPersistence(): IndexeddbPersistence | null {
  return persistence;
}
