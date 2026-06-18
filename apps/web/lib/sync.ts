import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

let persistence: IndexeddbPersistence | null = null;
let provider: HocuspocusProvider | null = null;

const SESSION_KEY = 'highport_session_id';

export function getSessionId(scope: string): string {
  if (typeof window === 'undefined') {
    return `${scope}-server`;
  }
  const key = `${SESSION_KEY}:${scope}`;
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function initPersistence(doc: Y.Doc, name: string = 'highport-graph'): IndexeddbPersistence {
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

export function initProvider(
  doc: Y.Doc,
  campaignId: string = 'default',
  token?: string,
): HocuspocusProvider {
  if (provider) {
    return provider;
  }

  provider = new HocuspocusProvider({
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18121',
    name: `${campaignId}:graph`,
    document: doc,
    token: token || undefined,
  });

  provider.on('synced', () => {
    console.log(`[Sync] Connected to ${campaignId}:graph`);
  });

  return provider;
}

export function getProvider(): HocuspocusProvider | null {
  return provider;
}

export function destroyProvider(): void {
  if (provider) {
    provider.destroy();
    provider = null;
  }
}

export function destroyPersistence(): void {
  if (persistence) {
    persistence.destroy();
    persistence = null;
  }
}

export function resetSync(): void {
  destroyProvider();
  destroyPersistence();
}

export function waitForPersistenceSync(p: IndexeddbPersistence): Promise<void> {
  return new Promise((resolve) => {
    if (p.synced) {
      resolve();
      return;
    }
    p.once('synced', () => resolve());
  });
}

export async function initAndWaitForPersistence(
  doc: Y.Doc,
  name: string = 'highport-graph',
): Promise<IndexeddbPersistence> {
  const p = initPersistence(doc, name);
  await waitForPersistenceSync(p);
  return p;
}
