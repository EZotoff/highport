import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

let persistence: IndexeddbPersistence | null = null;
let provider: HocuspocusProvider | null = null;

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

export function initProvider(doc: Y.Doc, campaignId: string = 'default'): HocuspocusProvider {
  if (provider) {
    return provider;
  }

  provider = new HocuspocusProvider({
    url: 'ws://localhost:3001',
    name: `${campaignId}:graph`,
    document: doc,
  });

  provider.on('synced', () => {
    console.log(`[Sync] Connected to ${campaignId}:graph`);
  });
  
  return provider;
}

export function getProvider(): HocuspocusProvider | null {
  return provider;
}
