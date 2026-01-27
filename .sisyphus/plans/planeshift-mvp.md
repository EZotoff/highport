# PlaneShift MVP - Campaign Management Platform

## Context

### Original Request
Build PlaneShift - a real-time collaborative TTRPG campaign management platform serving as a "second screen" for Foundry VTT, specifically targeting Mongoose Traveller 2e campaigns.

### Interview Summary
**Key Discussions**:
- **Scope**: Full 4-phase roadmap (Graph → Tables → RAG → Foundry Integration)
- **Stack**: Next.js 14 + Fastify + FastAPI, Neon (Postgres), Pinecone, Vercel
- **Testing**: TDD with RED-GREEN-REFACTOR cycle
- **Team**: Multi-agent AI dev team (sequential by default, parallel only when no conflicts)
- **Node Types**: Hybrid approach - Traveller-aligned base types + custom extensible
- **Foundry**: Standalone bridge module working with vanilla mgt2e (no fork)

**Research Findings**:
- Yjs: Flat Y.Map structure for nodes/edges, singleton pattern for React, binary persistence to Postgres
- React Flow: 500-1000 nodes viable with `onlyRenderVisibleElements={true}`, memoize custom nodes
- GraphRAG: MUST pre-filter at vector DB level (Pinecone metadata filtering)
- Foundry V11+: LevelDB lock means API-only access, use Hooks.on("updateActor")

---

## Spec Deviations from PROJECT_BRIEF_v2.md

> **This plan is the authoritative source of truth for implementation.**
> Where this plan differs from PROJECT_BRIEF_v2.md, this plan takes precedence.
> Deviations are documented below with rationale.

### Deviation 1: Edges Storage Type
- **Brief (Section 3.2.1)**: `Edges (Y.Array<Edge>)`
- **This Plan**: `edges: Y.Map<string, Y.Map>` (keyed by edge ID)
- **Rationale**: Y.Map allows O(1) edge lookup/update by ID, which is critical for edge deletion when nodes are removed. Y.Array requires O(n) scan. The brief's rationale for Y.Array ("helps with Z-indexing") is not compelling since edge rendering order rarely matters.

### Deviation 2: Base Resources Schema
- **Brief (Section 4.1)**: Generic resources (RU, PWH, Morale)
- **This Plan**: Traveller-specific resources (Credits, Ship Fuel, Cargo Space, Maintenance, Life Support)
- **Rationale**: User explicitly requested Traveller-themed resources during interview. The extensibility requirement (GM can add custom resources) is preserved.

### Deviation 3: Node Property Naming
- **Brief (Appendix A1.1)**: Uses `meta: { description, foundry_uuid, tags, ... }`
- **This Plan**: Uses `metadata` (consistent with brief Section 3.2.1)
- **Decision**: Use `metadata` everywhere for consistency. The `meta` vs `metadata` inconsistency in the brief is resolved in favor of `metadata`.

### Deviation 4: Position Structure
- **Brief (Section 3.2.1)**: `position: Y.Map {x: float, y: float}` (nested Y.Map)
- **This Plan**: `position: { x: number, y: number }` (plain object stored in Y.Map)
- **Rationale**: React Flow expects plain `{x, y}` objects. Wrapping in Y.Map adds complexity without benefit since position updates are atomic (both x and y change together).

---

## Work Objectives

### Core Objective
Build a real-time collaborative campaign management platform that synchronizes narrative state (characters, factions, events) between a web application and Foundry VTT, with AI-powered knowledge retrieval gated by character permissions.

### Concrete Deliverables
1. **Lifepath Graph**: Interactive node/edge graph with real-time multi-user editing
2. **Campaign Tables**: Base resources and faction reputation tracking
3. **GraphRAG Chat**: AI lore assistant with character-knowledge gating
4. **Foundry Bridge**: Bi-directional sync module for mgt2e

### Definition of Done
- [ ] Multiple users can simultaneously edit graph nodes with <200ms sync latency
- [ ] Graph persists to database and survives page reload
- [ ] RAG queries respect character knowledge permissions
- [ ] Foundry module syncs Actor changes to PlaneShift and vice versa
- [ ] All CRDT merge logic has passing unit tests
- [ ] Application deploys to Vercel with managed backend services

### Must Have
- Real-time collaboration (Yjs CRDT)
- Offline resilience (local-first with sync on reconnect)
- Knowledge gating (characters only see what they know)
- TDD for all core logic

### Must NOT Have (Guardrails)
- NO minigames (Hacking, Negotiation) - deferred to v2.0
- NO progress clocks/research workflow - deferred to v2.0
- NO forking mgt2e - use standalone bridge module only
- NO custom Foundry UI modifications - API integration only
- NO over-abstraction before patterns emerge
- NO animated edges in React Flow (performance)
- NO post-retrieval filtering for RAG (must pre-filter at Pinecone)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **User wants tests**: TDD
- **Framework**: Vitest (frontend), Vitest (backend Node), pytest (Python)

### TDD Workflow
Each TODO follows RED-GREEN-REFACTOR:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimum code to pass
3. **REFACTOR**: Clean up while keeping green

### Offline Persistence Strategy
The MVP requires "offline resilience" (local-first with sync on reconnect).

**Implementation:**
- **Task 2**: Add `y-indexeddb` provider to persist Y.Doc locally in browser IndexedDB
- **Task 4**: Server persistence complements (not replaces) local persistence
- **Reconnect flow**: On reconnect, Yjs automatically syncs local changes to server

**Yjs Provider Stack (in order):**
1. `IndexeddbPersistence` - Local browser storage (always active)
2. `WebsocketProvider` - Server sync (when connected)

**Offline Behavior:**
- User edits while offline → changes saved to IndexedDB
- Reconnect → WebsocketProvider syncs deltas to server
- Other clients receive updates via server broadcast

### MVP Identity Model (No-Auth Mode)

> **This section defines how identity works during MVP development without a full auth system.**

**Phase 1-3 uses mock identity. Phase 4 can add real auth later.**

#### Identity Flow

```
User opens app → localStorage checked for `planeshift_user`
  → If exists: use stored { userId, name, color, isGM }
  → If not: generate user_{uuid}, pick random color, store to localStorage
  → isGM defaults to `false` unless ?gm=true query param (dev mode)
```

#### Canonical Identity Types

```typescript
// packages/shared/src/types/identity.ts

interface MockUser {
  userId: string;           // Format: user_{uuid} (stored in localStorage)
  name: string;             // Display name (editable)
  color: string;            // Hex color for presence (#RRGGBB)
  isGM: boolean;            // GM role flag
}

interface MockCharacter {
  characterId: string;      // Format: char_{uuid}
  name: string;             // Character name
  ownerId: string;          // userId who owns this character
}

// Active session state (stored in React context)
interface SessionState {
  user: MockUser;
  activeCharacter: MockCharacter | null;  // Currently selected character
}
```

#### Request Headers (Cross-Service)

All API requests include these headers for identity:

| Header | Value | Used By |
|--------|-------|---------|
| `X-User-Id` | `user_{uuid}` string | All services |
| `X-User-Name` | Display name | Logging |
| `X-Is-GM` | `true` or `false` | Permission checks |
| `X-Character-Id` | `char_{uuid}` or empty | RAG scope assembly |

**Example request:**
```http
GET /api/knowledge/scope HTTP/1.1
X-User-Id: user_550e8400e29b41d4a716446655440000
X-User-Name: Alice
X-Is-GM: false
X-Character-Id: char_660e8400e29b41d4a716446655440001
```

#### Identity Persistence

| Data | Storage | Lifetime |
|------|---------|----------|
| `userId`, `name`, `color`, `isGM` | localStorage | Until cleared |
| `activeCharacter` | sessionStorage | Per tab |
| Awareness presence | Yjs Awareness | Ephemeral (disconnects) |

#### GM Detection (Single Source of Truth)

**MVP GM Rule (Authoritative):**
```
1. Check localStorage 'planeshift_user'.isGM
2. If URL has ?gm=true → set isGM=true and persist to localStorage
3. Otherwise, use persisted isGM value (default: false)
```

**There is NO "first user becomes GM" automatic promotion in MVP.**
The "first user" fallback mentioned elsewhere is deferred to post-MVP when we have auth.

**How to become GM in MVP:**
1. Open app with `?gm=true` query param (one-time setup per browser)
2. This sets `isGM=true` in localStorage permanently for that browser
3. Remove `?gm=true` from URL - GM status persists

> **Note**: See "Usage in Code (Canonical Implementation)" below for the single authoritative implementation.

#### Usage in Code (Canonical Implementation)

> **This is the single source of truth for identity creation/retrieval.**
> Any other code snippets in this document are illustrative only.

```typescript
// apps/web/lib/identity.ts
import { generateUserId } from '@planeshift/shared/utils/id';

function randomColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getOrCreateUser(): MockUser {
  // 1. Check for ?gm=true promotion (before reading stored user)
  const urlParams = new URLSearchParams(window.location.search);
  const gmPromotion = urlParams.get('gm') === 'true';
  
  // 2. Read stored user (if exists)
  const storedJson = localStorage.getItem('planeshift_user');
  let user: MockUser | null = storedJson ? JSON.parse(storedJson) : null;
  
  // 3. Handle cases
  if (user) {
    // Existing user: check for GM promotion
    if (gmPromotion && !user.isGM) {
      user.isGM = true;
      localStorage.setItem('planeshift_user', JSON.stringify(user));
    }
  } else {
    // New user: create with defaults
    user = {
      userId: generateUserId(),
      name: 'Anonymous',
      color: randomColor(),
      isGM: gmPromotion,  // Only true if ?gm=true on first visit
    };
    localStorage.setItem('planeshift_user', JSON.stringify(user));
  }
  
  return user;
}

export function getActiveCharacter(): MockCharacter | null {
  const json = sessionStorage.getItem('planeshift_active_character');
  return json ? JSON.parse(json) : null;
}

export function setActiveCharacter(char: MockCharacter | null): void {
  if (char) {
    sessionStorage.setItem('planeshift_active_character', JSON.stringify(char));
  } else {
    sessionStorage.removeItem('planeshift_active_character');
  }
}
```

**Algorithm summary:**
1. Check URL for `?gm=true` FIRST
2. Load existing user from localStorage (if any)
3. If existing user AND `?gm=true`: promote to GM, persist
4. If new user AND `?gm=true`: create as GM
5. If new user AND no param: create as non-GM
6. **NO "first user becomes GM" logic exists**

**API Client (uses identity):**
```typescript
// apps/web/lib/api.ts  
import { getOrCreateUser, getActiveCharacter } from './identity';

export function apiClient(path: string, options?: RequestInit) {
  const user = getOrCreateUser();
  const char = getActiveCharacter();
  return fetch(path, {
    ...options,
    headers: {
      ...options?.headers,
      'X-User-Id': user.userId,
      'X-User-Name': user.name,
      'X-Is-GM': String(user.isGM),
      'X-Character-Id': char?.characterId ?? '',
    },
  });
}
```

---

### Campaign & Document ID Strategy

#### Relationship Model

```
Campaign (1) ──────┬──────> Document (graph) 
                   ├──────> Document (baseState)
                   └──────> Document (reputationState)
```

Each campaign has multiple Y.Doc documents (one per data type).

#### ID Formats

> **Note on ID format**: All IDs are opaque strings with a type prefix.
> The prefix makes IDs self-describing and prevents mixing different entity types.
> The suffix is a UUID with hyphens removed, but treat as opaque (don't parse).

| Entity | ID Format | Full Example |
|--------|-----------|--------------|
| Campaign | `campaign_{uuid}` | `campaign_550e8400e29b41d4a716446655440000` |
| Document | `{campaignId}:{docType}` | `campaign_550e8400e29b41d4a716446655440000:graph` |
| Node | `node_{uuid}` | `node_660e8400e29b41d4a716446655440000` |
| Edge | `edge_{uuid}` | `edge_770e8400e29b41d4a716446655440000` |
| User | `user_{uuid}` | `user_880e8400e29b41d4a716446655440000` |
| Character | `char_{uuid}` | `char_990e8400e29b41d4a716446655440000` |

> **Examples in this document** are sometimes truncated for readability
> (e.g., `campaign_550e8400` instead of full 32-char UUID suffix).
> Implementations MUST use full-length IDs.

**TypeScript helper:**
```typescript
// packages/shared/src/utils/id.ts
export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function generateCampaignId(): string {
  return generateId('campaign');
}
export function generateNodeId(): string {
  return generateId('node');
}
export function generateUserId(): string {
  return generateId('user');
}
export function generateCharacterId(): string {
  return generateId('char');
}
export function generateEdgeId(): string {
  return generateId('edge');
}
export function generateKnowledgeGrantId(): string {
  return generateId('grant');
}
```

#### DocType Values

> **Naming Convention (Authoritative):**
> - DocType strings: `camelCase` (e.g., `baseState`, `reputationState`)
> - Y.Doc top-level map names: **SAME** as DocType (e.g., `ydoc.getMap('baseState')`)
> - Database `doc_type` column: stores the DocType string as-is
> - Hocuspocus room name: `{campaignId}:{docType}` (e.g., `campaign_mvp_default:baseState`)

| DocType | Y.Doc Top-Level Map | Content |
|---------|---------------------|---------|
| `graph` | `ydoc.getMap('graph')` | nodes Y.Map, edges Y.Map |
| `baseState` | `ydoc.getMap('baseState')` | resources Y.Map, inventory Y.Map |
| `reputationState` | `ydoc.getMap('reputationState')` | factions Y.Map |

**Code Example:**
```typescript
// Correct usage
const docType = 'baseState';  // camelCase
const roomName = `${campaignId}:${docType}`;  // campaign_xyz:baseState
const dataMap = ydoc.getMap(docType);  // Same string as docType
```

#### URL Patterns

> **Note**: Examples below use truncated IDs for readability. Full IDs are 32+ chars.

| Endpoint | Pattern | Example (truncated) |
|----------|---------|---------------------|
| WebSocket (Hocuspocus) | `ws://host:3001` + `name` param | URL: `ws://localhost:3001`, name: `campaign_550e8400...:graph` |
| HTTP GET (fallback) | `/api/doc/{campaignId}/{docType}` | `/api/doc/campaign_550e8400.../graph` |

> **IMPORTANT**: Hocuspocus does NOT use path-based routing like `/yjs/{docId}`.
> The document identifier is passed via the `name` parameter to `HocuspocusProvider`, NOT in the URL path.
> See "Client Connection Code" in Persistence Architecture for the correct setup.

> **Note**: There is NO `POST /api/doc/.../update` endpoint. Persistence happens server-side via Hocuspocus hooks. See "Persistence Architecture" section.

#### MVP Single-Campaign Mode

For MVP, use a hardcoded default campaign until campaign CRUD is added:

```typescript
// packages/shared/src/constants.ts
// Note: This is a deliberate exception to the campaign_{uuid} format.
// It's a well-known constant, not a generated ID. Treat as opaque string.
export const DEFAULT_CAMPAIGN_ID = 'campaign_mvp_default';

// Usage in apps/web - see "Client Connection Code" in Persistence Architecture
// for complete HocuspocusProvider setup
const docId = `${DEFAULT_CAMPAIGN_ID}:graph`;  // Document name passed to provider
```

> **Exception**: `DEFAULT_CAMPAIGN_ID` intentionally uses a human-readable suffix
> rather than a UUID. ID validation/parsing MUST treat all campaign IDs as opaque
> strings (don't assume UUID suffix structure). Generated campaigns use UUID suffix.

**Future**: Campaign selector UI populates `activeCampaignId` in session state.

---

### Persistence Architecture (Authoritative Flow)

> **This section resolves ambiguity between Hocuspocus WebSocket transport and database persistence.**

#### The Flow

```
                                    ┌─────────────────────┐
                                    │   Neon PostgreSQL   │
                                    │  (document_updates) │
                                    └──────────▲──────────┘
                                               │
                                         5. Persist
                                               │
┌─────────┐    1. WS Connect    ┌──────────────┴──────────────┐
│ Client  │ ◄─────────────────► │     Fastify + y-websocket   │
│ (Yjs)   │    2. Sync State    │     (apps/server)           │
└─────────┘    3. Broadcast     └──────────────┬──────────────┘
     │                                         │
     │ 4. IndexedDB                      6. Compaction
     ▼                                   (periodic job)
┌─────────┐
│ Browser │
│ IDB     │
└─────────┘
```

#### Step-by-Step

1. **WS Connect**: Client opens WebSocket to Hocuspocus server (via `HocuspocusProvider` with `name` = docId)
2. **Sync State**: Server sends current Y.Doc state (loaded from DB on first connect)
3. **Broadcast**: Server relays client updates to all connected clients
4. **IndexedDB**: Client also persists to IndexedDB (y-indexeddb, parallel to WS)
5. **Persist**: Server hooks into Hocuspocus `onChange` events, writes to `document_updates` table
6. **Compaction**: Background job merges updates into `documents.yjs_state` every N minutes

#### Server-Side Persistence (NOT client HTTP POST)

The plan originally suggested client HTTP POSTs for persistence. **Corrected approach:**

- **y-websocket server already receives all updates** via WebSocket
- Server hooks into `doc.on('update', ...)` to persist to Postgres
- NO separate client HTTP POST for updates (redundant)
- HTTP GET `/api/doc/{campaignId}/{docType}` returns merged state (for initial load fallback)

#### Initial Document Load

1. Client connects to WebSocket
2. y-websocket server loads doc from DB if not in memory
3. Server syncs state to client
4. Client applies to local Y.Doc
5. IndexedDB provider also loads local state → Yjs merges automatically

#### Compaction Strategy

| Trigger | Action |
|---------|--------|
| Every 5 minutes | Merge `document_updates` into `documents.yjs_state` |
| On doc unload (all clients disconnect) | Final merge + clear updates |
| Manual (admin) | Force compaction via `/api/admin/compact/{docId}` |

**Compaction query:**
```sql
-- Merge all updates since last compaction
UPDATE documents 
SET yjs_state = $merged_state, updated_at = NOW()
WHERE campaign_id = $campaign_id AND doc_type = $doc_type;

DELETE FROM document_updates 
WHERE doc_id = $doc_id AND created_at < $compaction_time;
```

#### Hocuspocus Persistence Integration (Implementation Details)

> **Server Package Decision**: We use [Hocuspocus](https://hocuspocus.dev/) instead of raw y-websocket.
> Hocuspocus provides a proper server-side lifecycle with persistence hooks out of the box.
> This avoids reimplementing document lifecycle management.

**Why Hocuspocus over y-websocket-server:**
- Built-in `Database.fetch` hook for loading and `onChange` hook for incremental persistence
- Automatic document cleanup when last client disconnects
- TypeScript-first with good types
- Active maintenance and docs

#### Server Runtime Topology (Authoritative)

> **Single Authoritative Statement:**
> Hocuspocus runs as a STANDALONE server on port 3001. Fastify is NOT used for WebSocket transport.
> Fastify handles REST API endpoints on port 3002 (health checks, doc fallback, knowledge APIs).

| Component | Port | Responsibility |
|-----------|------|----------------|
| **Hocuspocus** | 3001 | WebSocket transport for Yjs sync (`ws://localhost:3001`) |
| **Fastify** | 3002 | REST API (`/health`, `/api/doc/*`, `/api/knowledge/*`) |

**Client Connection Code:**
```typescript
// apps/web/lib/sync.ts
import { HocuspocusProvider } from '@hocuspocus/provider';
import { ydoc } from './ydoc';
import { DEFAULT_CAMPAIGN_ID } from '@planeshift/shared/constants';

// docId format: {campaignId}:{docType}
const docId = `${DEFAULT_CAMPAIGN_ID}:graph`;

export const provider = new HocuspocusProvider({
  url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL || 'ws://localhost:3001',
  name: docId,  // Hocuspocus uses 'name' as the document identifier
  document: ydoc,
});

// Awareness for presence (cursors, selections)
export const awareness = provider.awareness;
```

**URL Contract:**
- Base WebSocket URL: `ws://localhost:3001` (local) or `wss://sync.planeshift.app` (production)
- Room/document name: Passed via `name` parameter to HocuspocusProvider
- The provider handles the WebSocket protocol internally
- **No path embedding** - docId is the room name, not part of the URL path

**Environment Variables (updated):**
| Env Var | Local | Production |
|---------|-------|------------|
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | `ws://localhost:3001` | `wss://sync.planeshift.app` |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3002` | `https://api.planeshift.app` |

**Step-by-step lifecycle using Hocuspocus:**

> **Hocuspocus Version**: `@hocuspocus/server@2.x` (pin in Task 0)
> Hocuspocus hook names and signatures differ between versions. This plan targets v2.x.

1. **Server Setup (Hocuspocus standalone on port 3001)**:
   ```typescript
   // apps/server/src/ws/hocuspocus.ts
   import { Hocuspocus } from '@hocuspocus/server';
   import { Database } from '@hocuspocus/extension-database';
   import { db } from '../db/client';  // Drizzle client
   import { ensureDocumentExists } from './bootstrap';  // See below
   
   export const hocuspocus = new Hocuspocus({
     port: 3001,
     extensions: [
       new Database({
         // Called when first client connects - load state from DB
         async fetch({ documentName }) {
           const docId = documentName;
           
           // CRITICAL: Ensure parent rows exist BEFORE any DB operations
           await ensureDocumentExists(docId);
           
           // Load compacted state
           const snapshot = await db.query.documents.findFirst({
             where: eq(documents.id, docId),
           });
           
           // Apply pending updates on top of snapshot
           const pendingUpdates = await db.query.documentUpdates.findMany({
             where: eq(documentUpdates.docId, docId),
             orderBy: [asc(documentUpdates.createdAt)],
           });
           
           if (!snapshot?.yjsState && pendingUpdates.length === 0) {
             return null;  // New document, no state to load
           }
           
           // Merge snapshot + pending updates
           const doc = new Y.Doc();
           if (snapshot?.yjsState) {
             Y.applyUpdate(doc, snapshot.yjsState);
           }
           for (const update of pendingUpdates) {
             Y.applyUpdate(doc, update.updateData);
           }
           
           return Y.encodeStateAsUpdate(doc);
         },
         
         // Called on EACH incremental update from any client
         // This is the correct hook for storing incremental updates
         async store({ documentName, state, document }) {
           // NOTE: In Hocuspocus v2, `store` receives the FULL document state
           // For incremental storage, use `onChange` extension instead
           // This is kept for snapshot/compaction purposes
         },
       }),
     ],
     
     // onChange is called for EACH incremental update (Uint8Array)
     async onChange({ documentName, update }) {
       const docId = documentName;
       const updateId = generateId('update');
       
       // Parent rows guaranteed by fetch() (runs first on connect)
       // Store the incremental Yjs update (binary diff)
       await db.insert(documentUpdates).values({
         id: updateId,
         docId,
         updateData: update,  // Uint8Array - the actual incremental update
         createdAt: new Date(),
       });
     },
     
     // Called when last client disconnects
     async onDisconnect({ documentName, clientsCount }) {
       if (clientsCount === 0) {
         // Last client left - trigger compaction
         await compactDocument(documentName);
       }
     },
   });
   ```

   **Hook Behavior Summary (Hocuspocus v2):**
   | Hook | When Called | Receives | Our Usage |
   |------|-------------|----------|-----------|
   | `Database.fetch` | First client connects | documentName | Load snapshot + pending updates |
   | `onChange` | Each client edit | documentName, update (Uint8Array) | Store incremental update |
   | `onDisconnect` | Client disconnects | documentName, clientsCount | Trigger compaction when last client leaves |

2. **Document Bootstrapping (Handles FK Constraints)**:
   ```typescript
   // apps/server/src/ws/bootstrap.ts
   import { db } from '../db/client';
   import { campaigns, documents } from '../db/schema';
   import { DEFAULT_CAMPAIGN_ID } from '@planeshift/shared/constants';
   
   /**
    * Ensures the campaign and document rows exist before any persistence.
    * Called in onLoadDocument BEFORE reading or writing.
    * Uses upserts to handle concurrent first-writes safely.
    */
   export async function ensureDocumentExists(docId: string): Promise<void> {
     // Parse docId: "{campaignId}:{docType}"
     const [campaignId, docType] = docId.split(':');
     if (!campaignId || !docType) {
       throw new Error(`Invalid docId format: ${docId}. Expected "{campaignId}:{docType}"`);
     }
     
     // 1. Ensure campaign exists (upsert - no-op if exists)
     await db.insert(campaigns)
       .values({
         id: campaignId,
         name: campaignId === DEFAULT_CAMPAIGN_ID ? 'Default Campaign' : 'Unnamed Campaign',
         ownerId: 'system',  // Placeholder until auth exists
         createdAt: new Date(),
       })
       .onConflictDoNothing();  // If already exists, skip
     
     // 2. Ensure document row exists (upsert - no-op if exists)
     await db.insert(documents)
       .values({
         id: docId,
         campaignId,
         docType,
         yjsState: null,  // No initial state (empty doc)
         updatedAt: new Date(),
       })
       .onConflictDoNothing();  // If already exists, skip
   }
   ```

   **First-Write Scenario (Step-by-Step):**
   1. Client connects to `campaign_mvp_default:graph`
   2. Hocuspocus calls `Database.fetch`
   3. `ensureDocumentExists` is called FIRST
   4. Upserts `campaigns` row (no-op if exists)
   5. Upserts `documents` row (no-op if exists)
   6. Now FK constraints are satisfied for any `document_updates` inserts
   7. `Database.fetch` continues - loads snapshot (null for new doc)
   8. Client edits trigger `onChange` hook - inserts work because parent rows exist

   **Migration Seed (Alternative for DEFAULT_CAMPAIGN_ID):**
   ```sql
   -- apps/server/drizzle/0001_seed_default_campaign.sql
   -- Run as part of db:migrate, ensures default campaign exists
   INSERT INTO campaigns (id, name, owner_id, created_at)
   VALUES ('campaign_mvp_default', 'Default Campaign', 'system', NOW())
   ON CONFLICT (id) DO NOTHING;
   ```

   **Design Decision**: We use BOTH approaches:
   - Migration seeds the known `DEFAULT_CAMPAIGN_ID`
   - Runtime `ensureDocumentExists` handles any future dynamic campaigns

3. **Database Client Setup (Drizzle + postgres driver)**:
   ```typescript
   // apps/server/src/db/client.ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   import * as schema from './schema';
   
   const queryClient = postgres(process.env.DATABASE_URL!);
   export const db = drizzle(queryClient, { schema });
   
   // For raw SQL when needed (e.g., advisory locks)
   export const sql = queryClient;
   ```

3. **Compaction (with locking to prevent race conditions)**:
   ```typescript
   // apps/server/src/ws/compaction.ts
   import { db, sql } from '../db/client';
   import * as Y from 'yjs';
   
   // Hash docId to int for pg_advisory_lock (stable numeric hash)
   function hashDocIdToInt(docId: string): number {
     let hash = 0;
     for (let i = 0; i < docId.length; i++) {
       hash = ((hash << 5) - hash) + docId.charCodeAt(i);
       hash = hash & hash;  // Convert to 32bit integer
     }
     return Math.abs(hash);
   }
   
   export async function compactDocument(docId: string): Promise<void> {
     const lockId = hashDocIdToInt(docId);
     
     // Advisory lock for this document (session-level, auto-releases on disconnect)
     await sql`SELECT pg_advisory_lock(${lockId})`;
     
     try {
       // Get current timestamp BEFORE reading updates
       const now = new Date();
       
       // Load all updates up to this timestamp
       const updates = await db.query.documentUpdates.findMany({
         where: and(
           eq(documentUpdates.docId, docId),
           lte(documentUpdates.createdAt, now)
         ),
         orderBy: [asc(documentUpdates.createdAt)],
       });
       
       if (updates.length === 0) {
         return;  // Nothing to compact
       }
       
       // Load current snapshot
       const snapshot = await db.query.documents.findFirst({
         where: eq(documents.id, docId),
       });
       
       // Merge all updates
       const doc = new Y.Doc();
       if (snapshot?.yjsState) {
         Y.applyUpdate(doc, snapshot.yjsState);
       }
       for (const update of updates) {
         Y.applyUpdate(doc, update.updateData);
       }
       const mergedState = Y.encodeStateAsUpdate(doc);
       
       // Upsert merged state
       await db.insert(documents)
         .values({
           id: docId,
           campaignId: docId.split(':')[0],
           docType: docId.split(':')[1],
           yjsState: mergedState,
           updatedAt: now,
         })
         .onConflictDoUpdate({
           target: documents.id,
           set: { yjsState: mergedState, updatedAt: now },
         });
       
       // Delete only updates we merged (by timestamp)
       await db.delete(documentUpdates)
         .where(and(
           eq(documentUpdates.docId, docId),
           lte(documentUpdates.createdAt, now)
         ));
     } finally {
       await sql`SELECT pg_advisory_unlock(${lockId})`;
     }
   }
   ```

4. **Periodic Compaction Job**:
   ```typescript
   // apps/server/src/jobs/compaction.ts
   import { hocuspocus } from '../ws/hocuspocus';
   
   // Run every 5 minutes
   setInterval(async () => {
     const activeDocNames = hocuspocus.getDocumentNames();
     for (const docName of activeDocNames) {
       try {
         await compactDocument(docName);
       } catch (e) {
         console.error(`Compaction failed for ${docName}:`, e);
       }
     }
   }, 5 * 60 * 1000);
   ```

**Race Condition Safety:**
- `pg_advisory_lock` prevents concurrent compaction of same doc
- Timestamp-based deletion ensures updates arriving DURING compaction are not lost
- Hocuspocus handles document lifecycle internally

---

### Scope Tag Specification (RAG Knowledge Gating)

> **This is the canonical, single source of truth for access scope tags.**
> Used by Task 11 (ingestion), Task 12 (gating), and Task 13 (query).
>
> **Note**: PROJECT_BRIEF_v2.md uses `scope:public`, `scope:gm` format in some examples.
> This plan standardizes on the format below WITHOUT the `scope:` prefix.
> This plan is authoritative; ignore the brief's prefix variant.

#### Tag Format

All scope tags follow this format:

```
{type}:{value}  (for namespaced tags)
{type}          (for simple tags like public, gm, party)
```

#### Tag Namespaces

| Type | Pattern | Example | Meaning | Grantable? |
|------|---------|---------|---------|------------|
| `public` | `public` | `public` | Anyone can access | No (automatic) |
| `gm` | `gm` | `gm` | GM-only access | No (role-based) |
| `party` | `party` | `party` | All player characters | No (automatic) |
| `char` | `char:{characterId}` | `char:char_660e8400...` | Specific character's personal data | No (automatic) |
| `faction` | `faction:{factionId}` | `faction:imperial-navy` | Faction members know this | No (membership-based) |
| `secret` | `secret:{slug}` | `secret:ancient-artifact-location` | **Grantable secret knowledge** | **YES** |

#### Grantable Knowledge Tags (`secret:*`)

The `secret:{slug}` namespace is for discoverable secrets that can be granted to characters:

**How it works:**
1. **Ingestion**: GM uploads lore document tagged with `access_scope: ["gm", "secret:lost-city"]`
2. **Initial state**: Only GM can query this content
3. **Discovery**: During play, character discovers the secret
4. **Grant**: GM calls `/api/knowledge/grant` with `{ characterId: "char_abc", knowledgeTag: "secret:lost-city" }`
5. **Access**: Character's scope now includes `secret:lost-city`, so RAG returns the content

**Slug naming convention:**
- Lowercase alphanumeric with hyphens: `^[a-z0-9-]+$`
- Max 64 characters
- Human-readable (not UUIDs)
- Examples: `ancient-artifact-location`, `traitor-identity`, `secret-base-coords`

#### Scope Assembly Algorithm

```typescript
// apps/server/src/services/scope.ts

async function assembleScope(userId: string, characterId: string | null, isGM: boolean): Promise<string[]> {
  const scope: string[] = ['public'];
  
  if (isGM) {
    scope.push('gm');
  }
  
  if (characterId) {
    scope.push(`char:${characterId}`);
    scope.push('party');
    
    // Add faction scopes from character's faction memberships
    const factions = await getFactionMemberships(characterId);
    for (const f of factions) {
      scope.push(`faction:${f.factionId}`);
    }
    
    // Add granted secret knowledge
    const grants = await getKnowledgeGrants(characterId);
    for (const g of grants) {
      scope.push(g.knowledgeTag);  // e.g., "secret:lost-city"
    }
  }
  
  return scope;
}
```

#### Pinecone Metadata Shape

When upserting vectors to Pinecone:

```json
{
  "id": "chunk_abc123",
  "values": [0.1, 0.2, ...],
  "metadata": {
    "source_id": "doc_xyz",
    "access_scope": ["public", "gm", "secret:ancient-artifact-location"],
    "entities": ["Captain Zara", "Imperial Navy"],
    "chunk_index": 0
  }
}
```

#### Pinecone Query Filter

```python
# apps/rag-service/services/retrieval.py

def query_with_scope(query_embedding: list[float], scope: list[str], top_k: int = 10):
    return pinecone_index.query(
        vector=query_embedding,
        top_k=top_k,
        filter={
            "access_scope": {"$in": scope}  # Match ANY tag in scope
        },
        include_metadata=True
    )
```

#### Database Schema (character_knowledge)

> **Note**: IDs are generated in application code, not by Postgres.
> See "UUID Generation" in "Database Ownership & Migrations" section.

```sql
CREATE TABLE character_knowledge (
  id VARCHAR(64) PRIMARY KEY,              -- Generated in app via generateId()
  character_id VARCHAR(64) NOT NULL,       -- e.g., 'char_abc123...'
  knowledge_tag VARCHAR(255) NOT NULL,     -- ONLY 'secret:*' tags are grantable
  granted_by VARCHAR(64) NOT NULL,         -- userId who granted
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, knowledge_tag),
  CONSTRAINT valid_grantable_tag CHECK (knowledge_tag LIKE 'secret:%')
);
```

> **Important**: The `character_knowledge` table ONLY stores `secret:*` tags.
> Other scope types (`public`, `gm`, `party`, `char:*`, `faction:*`) are computed
> automatically based on role and relationships, not stored as grants.

#### Example Scope Scenarios

> **Note**: Character IDs below are truncated for readability.

| User | Character | isGM | Grants | Assembled Scope |
|------|-----------|------|--------|-----------------|
| Alice | char_garrus123... | false | `secret:traitor-identity` | `['public', 'party', 'char:char_garrus123...', 'faction:imperial-navy', 'secret:traitor-identity']` |
| Bob | None | true | (none) | `['public', 'gm']` |
| Carol | char_zara456... | false | (none) | `['public', 'party', 'char:char_zara456...']` |

#### Document Scope Update Flow (Scope Editor → Pinecone)

> **This section specifies how the scope editor UI propagates changes to Pinecone vectors.**
> Without this, Task 12's UI requirement is not implementable.

**Architecture Overview:**

```
┌─────────────────┐    PATCH /api/documents/:sourceId/scope    ┌─────────────────┐
│   Web Client    │ ─────────────────────────────────────────► │  apps/server    │
│ (Scope Editor)  │                                            │   (Fastify)     │
└─────────────────┘                                            └────────┬────────┘
                                                                        │
                                                               1. Update ingested_documents
                                                               2. Call RAG service
                                                                        │
                                                                        ▼
                                                               ┌─────────────────┐
                                                               │ apps/rag-service│
                                                               │ POST /update-scope
                                                               └────────┬────────┘
                                                                        │
                                                               3. Fetch vectors by source_id
                                                               4. Update metadata in Pinecone
                                                                        │
                                                                        ▼
                                                               ┌─────────────────┐
                                                               │    Pinecone     │
                                                               └─────────────────┘
```

**Step 1: Document Tracking Table (apps/server)**

```sql
-- Store ingested documents for scope editing
CREATE TABLE ingested_documents (
  id VARCHAR(64) PRIMARY KEY,           -- generateId('doc')
  campaign_id VARCHAR(64) NOT NULL REFERENCES campaigns(id),
  filename VARCHAR(255) NOT NULL,
  access_scope TEXT[] NOT NULL DEFAULT '{"public"}',  -- Current scope tags
  chunk_count INTEGER NOT NULL,          -- Number of vectors in Pinecone
  ingested_at TIMESTAMP DEFAULT NOW(),
  ingested_by VARCHAR(64) NOT NULL       -- userId who uploaded
);
```

**Step 2: Server Endpoint (apps/server)**

```typescript
// apps/server/src/routes/documents.ts
fastify.patch('/api/documents/:sourceId/scope', async (req, reply) => {
  const { sourceId } = req.params;
  const { accessScope } = req.body;  // string[] of scope tags
  const userId = req.headers['x-user-id'];
  const isGM = req.headers['x-is-gm'] === 'true';
  
  // Only GM can change scope
  if (!isGM) {
    return reply.status(403).send({ error: 'Only GM can modify document scope' });
  }
  
  // Update local database
  await db.update(ingestedDocuments)
    .set({ accessScope })
    .where(eq(ingestedDocuments.id, sourceId));
  
  // Forward to RAG service to update Pinecone
  await fetch(`${RAG_SERVICE_URL}/update-scope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId, accessScope }),
  });
  
  return { status: 'updated' };
});
```

**Step 3: RAG Service Endpoint (apps/rag-service)**

```python
# apps/rag-service/routers/scope.py
from fastapi import APIRouter
from pinecone import Pinecone

router = APIRouter()
pc = Pinecone()
index = pc.Index("planeshift-lore")

@router.post("/update-scope")
async def update_scope(request: UpdateScopeRequest):
    """Update access_scope metadata for all vectors from a source document."""
    source_id = request.source_id
    new_scope = request.access_scope
    
    # Fetch vector IDs by source_id metadata
    # Note: Pinecone doesn't support querying by metadata alone,
    # so we use a dummy query with filter
    results = index.query(
        vector=[0.0] * 1536,  # Dummy vector (will be ignored due to filter)
        filter={"source_id": {"$eq": source_id}},
        top_k=10000,  # Get all chunks from this doc
        include_metadata=True,
    )
    
    if not results.matches:
        raise HTTPException(404, f"No vectors found for source_id: {source_id}")
    
    # Update each vector's metadata
    updates = []
    for match in results.matches:
        updates.append({
            "id": match.id,
            "set_metadata": {"access_scope": new_scope}
        })
    
    # Batch update (Pinecone supports up to 1000 per batch)
    for i in range(0, len(updates), 1000):
        batch = updates[i:i+1000]
        index.update(id=batch[0]["id"], set_metadata=batch[0]["set_metadata"])
        # Note: For true batch update, use index.update with vectors list
    
    return {"updated_count": len(updates)}
```

**Step 4: Scope Editor UI (apps/web)**

```typescript
// apps/web/components/rag/ScopeEditor.tsx
interface ScopeEditorProps {
  document: IngestedDocument;
  onUpdate: () => void;
}

export function ScopeEditor({ document, onUpdate }: ScopeEditorProps) {
  const [scope, setScope] = useState<string[]>(document.accessScope);
  
  const handleSave = async () => {
    await apiClient(`/api/documents/${document.id}/scope`, {
      method: 'PATCH',
      body: JSON.stringify({ accessScope: scope }),
    });
    onUpdate();
  };
  
  // UI with checkboxes for public/gm/party, dropdown for factions, text input for secrets
}
```

**Task 12 Updated What To Do** (add to existing list):
- Create `ingested_documents` table to track uploaded docs and their scope
- Create `PATCH /api/documents/:sourceId/scope` endpoint in apps/server
- Create `POST /update-scope` endpoint in apps/rag-service
- UI shows list of ingested documents with current scope, allows editing

**Task 12 Updated Acceptance Criteria** (add to existing list):
- [ ] `ingested_documents` table exists with `access_scope` column
- [ ] `PATCH /api/documents/:sourceId/scope` with `{ accessScope: ["gm", "secret:x"] }` → updates DB and Pinecone
- [ ] Pinecone vectors for that source_id now have updated `access_scope` metadata
- [ ] Non-GM user → 403 Forbidden when trying to update scope

---

### Database Ownership & Migrations
All PostgreSQL tables are owned by `apps/server` (Node.js service).

| Table | Owner | Used By |
|-------|-------|---------|
| `campaigns` | apps/server | apps/web, apps/server |
| `documents` | apps/server | apps/server |
| `document_updates` | apps/server | apps/server |
| `character_knowledge` | apps/server | apps/server, apps/rag-service |
| `users` | apps/server | all |

**ORM Decision: Drizzle ORM**

We use [Drizzle ORM](https://orm.drizzle.team/) for the following reasons:
- TypeScript-first with excellent type inference
- SQL-like syntax (less abstraction than Prisma)
- Lightweight, no heavy runtime
- Good migration support

**Migration Strategy:**
- Migrations live in `apps/server/drizzle/`
- Schema defined in `apps/server/src/db/schema.ts`
- `pnpm --filter server db:generate` generates migrations from schema changes
- `pnpm --filter server db:migrate` applies migrations
- CI runs migrations before tests

**UUID Generation:**
IDs are generated **in application code**, not by Postgres `gen_random_uuid()`.
- All ID generation uses `packages/shared/src/utils/id.ts` functions
- Database columns use `VARCHAR(64)` or `TEXT`, not `UUID` type
- This avoids `pgcrypto` extension dependency and works with Neon free tier

**Corrected schema example:**
```sql
CREATE TABLE character_knowledge (
  id VARCHAR(64) PRIMARY KEY,              -- Generated in app: generateId('grant')
  character_id VARCHAR(64) NOT NULL,       -- e.g., 'char_abc123...'
  knowledge_tag VARCHAR(255) NOT NULL,     -- ONLY 'secret:*' tags
  granted_by VARCHAR(64) NOT NULL,         -- userId who granted
  granted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, knowledge_tag),
  CONSTRAINT valid_grantable_tag CHECK (knowledge_tag LIKE 'secret:%')
);
```

**Local Postgres & CI Setup:**
See Task 0 for complete `docker-compose.yml`, `.env.test`, and `.github/workflows/ci.yml` specifications.

**DATABASE_URL Policy:**

| Environment | DATABASE_URL Source | Value |
|-------------|---------------------|-------|
| **Local dev** | `apps/server/.env` | `postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test` |
| **Local test** | `apps/server/.env.test` | Same as dev (uses docker-compose postgres) |
| **CI** | GitHub Actions env | `postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test` |
| **Production** | Vercel env vars | Neon connection string (set in Vercel dashboard) |

**Rule**: Local dev/test/CI all use the same credentials via docker-compose.
Neon is only used in production (Vercel). Task 4's "Create Neon database" is for production setup, not for running tests.

---

### RAG Service Configuration (Authoritative)

> **This section specifies exact model and index configurations to eliminate implementation guesswork.**

#### Embeddings Model

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Model** | `text-embedding-3-small` | OpenAI's cost-effective embedding model |
| **Dimensions** | 1536 | Default for text-embedding-3-small |
| **Provider** | OpenAI API | Consistent with ecosystem |

**Implementation:**
```python
# apps/rag-service/services/embeddings.py
from openai import OpenAI

client = OpenAI()  # Uses OPENAI_API_KEY env var

def embed(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding  # 1536 dimensions
```

#### Chunking Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Chunk size** | 500 tokens | Balance between context and granularity |
| **Chunk overlap** | 50 tokens | Maintain context across boundaries |
| **Tokenizer** | `tiktoken` with `cl100k_base` | Matches OpenAI embedding model |

**Implementation:**
```python
# apps/rag-service/services/chunking.py
import tiktoken

encoder = tiktoken.get_encoding("cl100k_base")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    tokens = encoder.encode(text)
    chunks = []
    start = 0
    while start < len(tokens):
        end = start + chunk_size
        chunk_tokens = tokens[start:end]
        chunks.append(encoder.decode(chunk_tokens))
        start = end - overlap
    return chunks
```

#### Pinecone Index Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Index name** | `planeshift-lore` | Descriptive, matches project |
| **Dimension** | 1536 | Matches text-embedding-3-small |
| **Metric** | `cosine` | Standard for semantic similarity |
| **Namespace** | `{campaignId}` | Isolate campaigns; use `"default"` for MVP |

**Index Creation (one-time setup):**
```python
# scripts/create_pinecone_index.py
from pinecone import Pinecone

pc = Pinecone()  # Uses PINECONE_API_KEY env var

pc.create_index(
    name="planeshift-lore",
    dimension=1536,
    metric="cosine",
    spec={"serverless": {"cloud": "aws", "region": "us-east-1"}}
)
```

**Environment Variables (RAG Service):**
| Env Var | Required | Purpose |
|---------|----------|---------|
| `OPENAI_API_KEY` | Integration tests only | Embeddings generation |
| `PINECONE_API_KEY` | Integration tests only | Vector storage |
| `PINECONE_INDEX_NAME` | Yes | Default: `planeshift-lore` |

**Unit vs Integration Test Strategy:**
- **Unit tests**: Mock `embed()` to return deterministic 1536-dim vectors; mock Pinecone client
- **Integration tests**: Use real APIs when `RUN_INTEGRATION=true` and keys are present
- Test fixtures provide canned embeddings for reproducible unit tests

---

### Foundry Bridge Transport Protocol (Authoritative)

> **This section defines the exact WebSocket protocol between Foundry VTT module and PlaneShift server.**
> Foundry sync is NOT via Hocuspocus (which uses Yjs protocol). It uses a separate JSON-RPC-like WebSocket.

#### Transport Architecture

```
┌─────────────────────┐           ┌─────────────────────┐
│   Foundry VTT       │           │   PlaneShift        │
│   (plane-shift-     │◄─────────►│   (apps/server)     │
│    bridge module)   │  WebSocket│   Fastify plugin    │
└─────────────────────┘   :3002   └─────────────────────┘
```

**Key Design Decisions:**
- **Separate from Hocuspocus**: Foundry sync uses plain JSON messages, not Yjs CRDT protocol
- **Runs on Fastify (port 3002)**: WebSocket upgrade handled by `@fastify/websocket`
- **Endpoint**: `ws://localhost:3002/foundry` (local) or `wss://api.planeshift.app/foundry` (production)
- **NOT compatible with Yjs**: This is a command/event protocol, not collaborative editing

#### Connection Setup

**Foundry Module (client):**
```javascript
// packages/foundry-module/src/socket.js
class FoundryBridge {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;  // Doubles each attempt, max 30s
  }

  connect() {
    const url = `${this.serverUrl}/foundry`;
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log("PlaneShift Bridge: Connected");
      this.reconnectAttempts = 0;
      // Send handshake
      this.send({ type: "handshake", apiKey: this.apiKey });
    };
    
    this.ws.onclose = () => {
      console.log("PlaneShift Bridge: Disconnected");
      this.scheduleReconnect();
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.handleMessage(msg);
    };
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("PlaneShift Bridge: Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(this.reconnectDelay * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }
  
  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
```

**Server (Fastify plugin):**
```typescript
// apps/server/src/api/foundry.ts
import { FastifyPluginAsync } from 'fastify';
import websocket from '@fastify/websocket';

export const foundryPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);
  
  fastify.get('/foundry', { websocket: true }, (socket, req) => {
    console.log('Foundry client connected');
    
    socket.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      handleFoundryMessage(socket, msg);
    });
    
    socket.on('close', () => {
      console.log('Foundry client disconnected');
    });
  });
};

function handleFoundryMessage(socket: WebSocket, msg: FoundryMessage) {
  switch (msg.type) {
    case 'handshake':
      // MVP: Log API key but don't validate
      console.log(`Foundry handshake received. API key present: ${!!msg.apiKey}`);
      socket.send(JSON.stringify({ type: 'handshake_ack', status: 'ok' }));
      break;
    case 'actor_update':
      handleActorUpdate(msg);
      break;
    // ... other message types
  }
}
```

#### Message Protocol

**Envelope Format:**
```typescript
interface FoundryMessage {
  type: string;           // Message type (see below)
  requestId?: string;     // Optional correlation ID
  apiKey?: string;        // Only in handshake
  payload?: object;       // Type-specific data
  timestamp?: number;     // Unix timestamp ms
}
```

**Message Types:**

| Type | Direction | Purpose | Payload |
|------|-----------|---------|---------|
| `handshake` | Foundry→Server | Initial connection | `{ apiKey: string }` |
| `handshake_ack` | Server→Foundry | Confirm connection | `{ status: 'ok' }` |
| `actor_update` | Foundry→Server | Actor changed in Foundry | See below |
| `node_update` | Server→Foundry | Node changed in PlaneShift | See below |
| `error` | Server→Foundry | Error response | `{ code: string, message: string }` |

**`actor_update` Payload:**
```typescript
{
  type: 'actor_update',
  timestamp: 1706234567890,
  payload: {
    actorId: 'mgt2e.actor.Abc123',      // Foundry Actor ID
    actorName: 'Captain Zara',
    changes: {
      'system.hits.value': 12,           // Dot-notation path
      'system.characteristics.str.value': 7,
    },
    foundryUuid: 'Actor.Abc123',         // For linking to graph nodes
  }
}
```

**`node_update` Payload:**
```typescript
{
  type: 'node_update',
  timestamp: 1706234567890,
  payload: {
    nodeId: 'node_550e8400...',
    foundryUuid: 'Actor.Abc123',         // Target Foundry actor
    changes: {
      'system.hits.value': 15,           // Changes to apply
    },
  }
}
```

#### Field Mapping (mgt2e ↔ PlaneShift)

| mgt2e Actor Path | PlaneShift Node Metadata | Sync Direction |
|------------------|-------------------------|----------------|
| `system.hits.value` | `metadata.hp.current` | Bidirectional |
| `system.hits.max` | `metadata.hp.max` | Foundry → PlaneShift only |
| `system.characteristics.str.value` | `metadata.characteristics.str` | Bidirectional |
| `system.finance.cash` | `metadata.credits` | Bidirectional |
| `name` | `label` | Bidirectional |

**Whitelisted fields** (only these sync, prevents accidental overwrites):
- `system.hits.*`
- `system.characteristics.*`
- `system.finance.cash`
- `name`

---

### Service URLs Policy

> **How services communicate in each environment.**
> See "Server Runtime Topology" in Persistence Architecture for authoritative port assignments.

#### Environment Variables

| Env Var | Used By | Local/CI | Production |
|---------|---------|----------|------------|
| `NEXT_PUBLIC_HOCUSPOCUS_URL` | apps/web (browser, WebSocket) | `ws://localhost:3001` | `wss://sync.planeshift.app` |
| `NEXT_PUBLIC_SERVER_URL` | apps/web (browser, REST) | `http://localhost:3002` | `https://api.planeshift.app` |
| `NEXT_PUBLIC_RAG_URL` | apps/web (browser) | `http://localhost:8000` | `https://rag.planeshift.app` |
| `SERVER_INTERNAL_URL` | apps/rag-service | `http://localhost:3002` | `http://server:3002` (internal) |

#### Request Routing

**Browser → Hocuspocus** (WebSocket for Yjs sync):
- Local: `ws://localhost:3001`
- Production: `wss://sync.planeshift.app`

**Browser → Fastify** (REST API):
- Local: `http://localhost:3002`
- Production: `https://api.planeshift.app`

**Browser → RAG Service** (REST):
- Local: Direct to `http://localhost:8000`
- Production: Direct to `https://rag.planeshift.app` (Railway/Render)
- **NOT proxied via Next.js** - browser calls RAG service directly
- Identity headers (`X-User-Id`, `X-Is-GM`, etc.) attached by `apiClient` wrapper in browser
- See Task 13 `rag-client.ts` for implementation

**RAG Service → Fastify** (REST, for scope assembly):
- Local: `http://localhost:3002/api/knowledge/scope`
- Production: Internal networking or public API

#### CORS Configuration

```typescript
// apps/server/src/api/index.ts (Fastify on port 3002)
fastify.register(cors, {
  origin: [
    'http://localhost:3000',      // Local Next.js
    'https://planeshift.app',     // Production
    'https://*.vercel.app',       // Preview deployments
  ],
});
```

```python
# apps/rag-service/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://planeshift.app",
        "https://*.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Local Development Setup

```bash
# Terminal 1: Postgres
docker compose up -d

# Terminal 2: Server (Hocuspocus on 3001, Fastify on 3002)
cd apps/server && pnpm dev

# Terminal 3: RAG Service (port 8000)
cd apps/rag-service && uvicorn main:app --reload

# Terminal 4: Web (port 3000)
cd apps/web && pnpm dev
```

**Cross-Service Access:**
- `apps/rag-service` accesses `character_knowledge` via REST API to `apps/server` (Fastify on 3002)
- RAG service does NOT have direct database access
- This ensures single source of truth for permissions

### Test Setup (Task 0)
Before any feature work, establish test infrastructure in each app.

### External Service Test Strategy
Tests must run without paid API credentials. Strategy by service:

| Service | Test Strategy | Env Vars Required |
|---------|--------------|-------------------|
| **Neon (Postgres)** | Use local PostgreSQL via Docker for unit tests; Neon for integration | `DATABASE_URL` (integration only) |
| **Pinecone** | Mock `pinecone.Index` in unit tests; use test index for integration | `PINECONE_API_KEY` (integration only) |
| **OpenAI Embeddings** | Mock `openai.embeddings.create()` returning fake 1536-dim vectors | `OPENAI_API_KEY` (integration only) |
| **Gemini LLM** | Mock `GeminiProvider.generate()` returning canned responses | `GEMINI_API_KEY` (integration only) |

**CI Pipeline:**
- Unit tests: Run with all mocks, no env vars required
- Integration tests: Run only when `RUN_INTEGRATION=true` and keys present
- Tests skip gracefully if env vars missing (pytest.mark.skipif / vitest.skipIf)

---

### Performance Measurement Procedures

> **This section defines HOW to measure the performance requirements in Definition of Done and Task 19.**
> Without concrete procedures, "60fps" and "<200ms" are unmeasurable claims.

#### Sync Latency Measurement (<200ms requirement)

**Manual Measurement (Development):**

1. Open two browser tabs connected to the same document
2. In both tabs, open DevTools → Network tab → filter by "WS" (WebSocket)
3. In Tab A, make an edit (e.g., drag a node)
4. Note the timestamp when the WebSocket frame is SENT from Tab A
5. In Tab B, observe when the WebSocket frame is RECEIVED
6. Calculate: `latency = Tab B receive timestamp - Tab A send timestamp`
7. Repeat 10 times, average should be <200ms on localhost

**Automated Measurement (Playwright E2E):**

```typescript
// apps/web/e2e/sync-latency.spec.ts
test('sync latency is under 200ms', async ({ browser }) => {
  const tab1 = await browser.newPage();
  const tab2 = await browser.newPage();
  
  await tab1.goto('/campaign/test');
  await tab2.goto('/campaign/test');
  
  // Wait for both to connect
  await tab1.waitForSelector('[data-testid="connection-status"][data-status="connected"]');
  await tab2.waitForSelector('[data-testid="connection-status"][data-status="connected"]');
  
  // Create a node in tab1 with timestamp
  const startTime = Date.now();
  await tab1.click('[data-testid="add-node-button"]');
  
  // Wait for node to appear in tab2
  await tab2.waitForSelector('[data-testid="graph-node"]', { timeout: 1000 });
  const endTime = Date.now();
  
  const latency = endTime - startTime;
  expect(latency).toBeLessThan(200);
  console.log(`Sync latency: ${latency}ms`);
});
```

**Awareness-based Measurement (Alternative):**

```typescript
// Add timestamp to awareness state for precise measurement
awareness.setLocalStateField('lastEdit', {
  action: 'nodeMove',
  timestamp: Date.now(),
  nodeId: node.id,
});

// In receiving client, calculate delta
awareness.on('change', () => {
  const states = awareness.getStates();
  for (const [clientId, state] of states) {
    if (state.lastEdit && clientId !== awareness.clientID) {
      const latency = Date.now() - state.lastEdit.timestamp;
      console.log(`Measured sync latency: ${latency}ms`);
    }
  }
});
```

#### Render Performance Measurement (500 nodes at 60fps)

**Manual Measurement (Chrome DevTools):**

1. Create or load a document with 500 nodes (use test data generator)
2. Open Chrome DevTools → Performance tab
3. Click "Record" (circle icon)
4. Perform 5 seconds of pan/zoom interactions on the canvas
5. Click "Stop"
6. Analyze the "Frames" section:
   - Green bars = frames rendered on time
   - Red/yellow bars = dropped frames (jank)
   - Target: All frames should be ≤16.67ms (60fps)
7. Hover over the flame graph to see individual frame times

**Acceptance Threshold:**
- 95%+ of frames should be ≤16.67ms
- No individual frame should exceed 50ms (noticeable jank)

**React DevTools Profiler (Component-level):**

1. Install React DevTools browser extension
2. Open app with 500 nodes
3. Open DevTools → Profiler tab
4. Click "Start profiling"
5. Pan/zoom for 5 seconds
6. Click "Stop profiling"
7. Check:
   - No component should re-render on every frame during pan
   - `GraphCanvas` render time should be <5ms
   - Custom node components should show "Memo" badge (not re-rendering)

**Automated Test (Playwright):**

```typescript
// apps/web/e2e/performance.spec.ts
test('renders 500 nodes at 60fps', async ({ page }) => {
  // Load test document with 500 nodes
  await page.goto('/campaign/perf-test');
  await page.waitForSelector('[data-testid="graph-canvas"][data-loaded="true"]');
  
  // Verify node count
  const nodeCount = await page.locator('[data-testid="graph-node"]').count();
  expect(nodeCount).toBe(500);
  
  // Use CDP to capture performance metrics
  const client = await page.context().newCDPSession(page);
  await client.send('Performance.enable');
  
  // Simulate pan (hold and drag)
  const canvas = page.locator('[data-testid="graph-canvas"]');
  await canvas.hover();
  await page.mouse.down();
  await page.mouse.move(500, 300, { steps: 50 });  // Slow drag
  await page.mouse.up();
  
  // Get metrics
  const metrics = await client.send('Performance.getMetrics');
  const layoutDuration = metrics.metrics.find(m => m.name === 'LayoutDuration')?.value || 0;
  
  // Layout should be minimal during pan (React Flow handles virtualization)
  console.log(`Layout duration: ${layoutDuration}s`);
});
```

**Test Data Generator:**

```typescript
// apps/web/scripts/generate-test-nodes.ts
import { generateNodeId } from '@planeshift/shared/utils/id';

export function generateTestNodes(count: number): GraphNode[] {
  const nodes: GraphNode[] = [];
  const gridSize = Math.ceil(Math.sqrt(count));
  
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    nodes.push({
      id: generateNodeId(),
      type: 'npc',
      label: `Test Node ${i}`,
      position: { x: col * 200, y: row * 150 },
      metadata: {},
      locked: false,
      hidden: false,
      created_at: Date.now(),
      created_by: 'test',
    });
  }
  return nodes;
}

// Usage: npx tsx apps/web/scripts/generate-test-nodes.ts 500 > test-nodes.json
```

---

## Task Flow

```
Phase 1: Lifepath Graph
[0] Monorepo Setup
    ↓
[1] Yjs Core ──────────────────┐
    ↓                          │
[2] React Flow Integration     │
    ↓                          ↓
    └────────────────┐   [5] Fastify Server (parallel-safe: different dirs)
                     ↓         ↓
                 [3] Presence ─┘ (needs both 2 and 5)
                     ↓
                 [4] Persistence (needs 5)
                     ↓
                 [6] Graph Polish

Phase 2: Campaign State
[7] Base Resources Table
    ↓
[8] Reputation Table
    ↓
[9] Graph-Table Linking

Phase 3: GraphRAG
[10] Python Service Setup
    ↓
[11] Document Ingestion
    ↓
[12] Knowledge Gating
    ↓
[13] Chat Interface

Phase 4: Foundry Integration
[14] Bridge Module Setup
    ↓
[15] Foundry → PlaneShift Sync
    ↓
[16] PlaneShift → Foundry Sync
    ↓
[17] Conflict Resolution
    ↓
[18] Manual Fallback
    ↓
[19] E2E Testing & Polish
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 1, 5 | Yjs client code and Fastify server are in different directories |
| B | 7, 10 | Tables (frontend) and Python service (separate app) are independent |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | React Flow needs Yjs types defined |
| 3 | 2, 5 | Presence needs both React Flow integration AND WebSocket server for awareness transport |
| 4 | 5 | Persistence hooks into Hocuspocus server |
| 11 | 10 | Ingestion needs FastAPI service |
| 15 | 14 | Sync logic needs module scaffold |

---

## TODOs

> **Execution Order Note**: Task numbers are for reference only. 
> Follow the Task Flow diagram for actual execution order:
> - Tasks 1 and 5 can run in parallel after Task 0
> - Task 3 requires BOTH Tasks 2 and 5 complete
> - Task 4 requires Task 5 complete (implement Task 5 before Task 4)

### Phase 1: Lifepath Graph (Core Engine)

- [x] 0. Monorepo & Test Infrastructure Setup

  **What to do**:
  - Initialize pnpm workspace with Turborepo
  - Create directory structure:
    - `apps/web` - Next.js 14 (App Router)
    - `apps/server` - Hocuspocus + Fastify (see Task 5 for details)
    - `apps/rag-service` - FastAPI (placeholder)
    - `packages/shared` - TypeScript types
    - `packages/foundry-module` - Foundry module (placeholder)
  - Configure Vitest for `apps/web` and `apps/server`
  - Configure ESLint, Prettier, TypeScript strict mode
  - Add pnpm overrides to force single Yjs version
  - Create example test in each app to verify setup
  - **Create README.md** (new file in project root):
    - Project title and description
    - Prerequisites section (Node 20, pnpm 9, Docker)
    - Quick start commands
    - Development setup instructions
    - "Run `docker compose up -d` before running server tests"
  - **Configure packages/shared**:
    - Create `packages/shared/package.json` with name `@planeshift/shared`
    - Configure TypeScript with `composite: true` for project references
    - Set up exports map for subpath imports:
      ```json
      {
        "name": "@planeshift/shared",
        "type": "module",
        "main": "./dist/index.js",
        "types": "./dist/index.d.ts",
        "exports": {
          ".": "./dist/index.js",
          "./types/*": "./dist/types/*.js",
          "./utils/*": "./dist/utils/*.js"
        },
        "typesVersions": {
          "*": {
            "*": ["./dist/*"],
            "types/*": ["./dist/types/*"],
            "utils/*": ["./dist/utils/*"]
          }
        },
        "scripts": {
          "build": "tsc",
          "dev": "tsc --watch"
        }
      }
      ```
    - Create `packages/shared/tsconfig.json`:
      ```json
      {
        "compilerOptions": {
          "target": "ES2022",
          "module": "ESNext",
          "moduleResolution": "bundler",
          "declaration": true,
          "declarationMap": true,
          "outDir": "./dist",
          "rootDir": "./src",
          "composite": true,
          "strict": true
        },
        "include": ["src/**/*"]
      }
      ```
    - **Build output**: `pnpm --filter shared build` runs `tsc`, producing:
      - `dist/index.js` + `dist/index.d.ts`
      - `dist/types/*.js` + `dist/types/*.d.ts`
      - `dist/utils/*.js` + `dist/utils/*.d.ts`
    - Create `packages/shared/src/types/index.ts` (re-exports)
    - Create `packages/shared/src/utils/id.ts` (ID generators)
    - Import pattern: `import { generateUserId } from '@planeshift/shared/utils/id'`
  - **Install Drizzle ORM** in `apps/server`:
    - `pnpm --filter server add drizzle-orm postgres`
    - `pnpm --filter server add -D drizzle-kit`
    - Create `apps/server/drizzle.config.ts`
    - Create `apps/server/src/db/schema.ts` (placeholder)
    - Add scripts: `db:generate`, `db:migrate`, `db:studio`
  - **Install Hocuspocus** in `apps/server`:
    - `pnpm --filter server add @hocuspocus/server@^2.0.0 @hocuspocus/extension-database@^2.0.0`
    - `pnpm --filter web add @hocuspocus/provider@^2.0.0`
    - **Pin major version 2.x** - Hocuspocus v2 hook signatures differ from v1
    - Verify: `pnpm ls @hocuspocus/server` shows `2.x.x`
  - **Create local Postgres setup**:
    - Create `docker-compose.yml` in project root (see spec below)
    - Create `apps/server/.env.test` with test DATABASE_URL
    - Document in README: how to start local Postgres for dev
  - **Create CI workflow**:
    - Create `.github/workflows/ci.yml` (see spec below)
    - Jobs: lint, typecheck, test (with Postgres service), build

  **docker-compose.yml** (project root):
  ```yaml
  version: '3.8'
  services:
    postgres:
      image: postgres:16-alpine
      ports:
        - "5432:5432"
      environment:
        POSTGRES_USER: planeshift
        POSTGRES_PASSWORD: planeshift_dev
        POSTGRES_DB: planeshift_test
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U planeshift -d planeshift_test"]
        interval: 5s
        timeout: 5s
        retries: 5
  ```

  **apps/server/.env.test**:
  ```bash
  DATABASE_URL=postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test
  ```

  **.github/workflows/ci.yml**:
  ```yaml
  name: CI
  on: [push, pull_request]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16-alpine
          env:
            POSTGRES_USER: planeshift
            POSTGRES_PASSWORD: planeshift_dev
            POSTGRES_DB: planeshift_test
          ports:
            - 5432:5432
          options: >-
            --health-cmd "pg_isready -U planeshift -d planeshift_test"
            --health-interval 10s
            --health-timeout 5s
            --health-retries 5
      
      env:
        DATABASE_URL: postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test
      
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
          with:
            version: 9
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'
        
        - run: pnpm install
        - run: pnpm lint
        - run: pnpm typecheck
        - run: pnpm --filter server db:migrate
        - run: pnpm test
        - run: pnpm build
  ```

  **Root package.json** (project root):
  ```json
  {
    "name": "planeshift",
    "private": true,
    "scripts": {
      "dev": "turbo dev",
      "build": "turbo build",
      "test": "turbo test",
      "lint": "turbo lint",
      "typecheck": "turbo typecheck",
      "e2e": "pnpm --filter web e2e"
    },
    "devDependencies": {
      "turbo": "^2.0.0"
    },
    "pnpm": {
      "overrides": {
        "yjs": "^13.6.0"
      }
    }
  }
  ```

  **turbo.json** (project root):
  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**", ".next/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "test": {
        "dependsOn": ["build"],
        "outputs": []
      },
      "lint": {
        "outputs": []
      },
      "typecheck": {
        "dependsOn": ["^build"],
        "outputs": []
      }
    }
  }
  ```

  **pnpm-workspace.yaml** (project root):
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
  ```

  **Must NOT do**:
  - Do not add application logic yet
  - Do not configure deployment yet

  **Parallelizable**: NO (foundation for all other tasks)

  **References**:
  - Turborepo docs: https://turbo.build/repo/docs
  - Yjs version pinning: Use `pnpm.overrides` in package.json
  - Vitest setup: https://vitest.dev/guide/
  - Drizzle ORM: https://orm.drizzle.team/docs/get-started-postgresql

  **Acceptance Criteria**:
  - [ ] `pnpm install` succeeds with no warnings
  - [ ] `pnpm test` runs and shows "1 passed" in each app
  - [ ] `pnpm build` succeeds for all apps
  - [ ] `pnpm --filter shared build` produces types in dist/
  - [ ] `packages/shared/package.json` has name `@planeshift/shared` with exports map
  - [ ] Import `import { generateUserId } from '@planeshift/shared/utils/id'` works in apps/web
  - [ ] Only ONE version of `yjs` in pnpm-lock.yaml
  - [ ] `apps/server/drizzle.config.ts` exists and is valid
  - [ ] `pnpm --filter server db:generate` runs without error (may warn "no changes")
  - [ ] `pnpm ls @hocuspocus/server --filter server` shows `2.x.x` (major version pinned)
  - [ ] `pnpm ls @hocuspocus/provider --filter web` shows `2.x.x`
  - [ ] `docker-compose.yml` exists in project root
  - [ ] `apps/server/.env.test` exists with DATABASE_URL
  - [ ] `.github/workflows/ci.yml` exists with postgres service
  - [ ] Root `package.json` exists with scripts: `dev`, `build`, `test`, `lint`, `typecheck`, `e2e`
  - [ ] `turbo.json` exists with task definitions for `build`, `dev`, `test`, `lint`, `typecheck`
  - [ ] `pnpm-workspace.yaml` exists with `apps/*` and `packages/*`
  - [ ] `README.md` exists in project root with:
    - Project title and description
    - Prerequisites (Node 20, pnpm 9, Docker)
    - Quick start commands
    - "Run `docker compose up -d` before running server tests"
  - [ ] Local test: `docker compose up -d && pnpm --filter server db:migrate && pnpm --filter server test` passes

  **Commit**: YES
  - Message: `chore: initialize monorepo with turborepo and test infrastructure`
  - Files: All new files
  - Pre-commit: `pnpm test`

---

- [x] 1. Yjs Document Structure & Types

  **What to do**:
  - Define TypeScript interfaces for graph entities in `packages/shared`:
  
  ```typescript
  // Canonical Yjs Schema - THIS IS AUTHORITATIVE
  // ID format: All IDs use prefixed format per "Campaign & Document ID Strategy"
  
  interface GraphNode {
    id: string;                    // Format: node_{uuid} (immutable after creation)
    type: NodeType;                // Enum value
    label: string;                 // Display name - plain string with LWW semantics
                                   // (Y.Text was considered for character-level collab,
                                   // but adds complexity; LWW is sufficient for MVP)
    position: { x: number; y: number }; // Plain object, NOT Y.Map
    metadata: {                    // Flexible payload
      description?: string;
      foundry_uuid?: string;       // Link to Foundry Actor/Item
      tags?: string[];
      image_url?: string;
      // Type-specific fields stored here
    };
    locked: boolean;               // If true, only GM can edit
    hidden: boolean;               // If true, invisible to non-GM
    created_at: number;            // Unix timestamp ms
    created_by: string;            // Format: user_{uuid} (from MVP Identity Model)
  }

  interface GraphEdge {
    id: string;                    // Format: edge_{uuid}
    source_id: string;             // Node ID (node_{uuid})
    target_id: string;             // Node ID (node_{uuid})
    relation_label: string;        // e.g., "Ally", "Enemy", "Located In"
    type: 'directional' | 'bi-directional' | 'undirected';
    weight: number;                // 1-5, affects line thickness
    style: 'solid' | 'dashed' | 'dotted';
    color: string;                 // Hex code
    hidden: boolean;
  }

  type NodeType = 
    | 'traveller' | 'npc' | 'spacecraft' | 'world'  // mgt2e-aligned
    | 'faction' | 'location'                         // Generic
    | 'event' | 'clue' | 'sector'                   // PlaneShift-only
    | `custom:${string}`;                           // User-defined
  ```
  
  - Also export identity types (from MVP Identity Model section):
  
  ```typescript
  // packages/shared/src/types/identity.ts
  interface MockUser {
    userId: string;
    name: string;
    color: string;
    isGM: boolean;
  }
  
  interface MockCharacter {
    characterId: string;
    name: string;
    ownerId: string;
  }
  ```
  
  - Create Yjs document singleton in `apps/web/lib/ydoc.ts`
  - Define Y.Map structure:
    - `nodes: Y.Map<string, Y.Map>` - outer keyed by node ID, inner Y.Map for each node
    - `edges: Y.Map<string, Y.Map>` - outer keyed by edge ID, inner Y.Map for each edge
  - **Storage Clarification (CRITICAL)**:
    - Each node/edge is stored as a **nested Y.Map**, NOT a plain JS object
    - This enables fine-grained conflict resolution (e.g., two users editing different fields)
    - TypeScript interfaces (`GraphNode`, `GraphEdge`) represent the **logical shape**
    - Conversion helpers translate between Y.Map and plain objects for React
  - Create conversion helpers:
    ```typescript
    // apps/web/lib/yjs-helpers.ts
    
    // Convert Y.Map to plain object for React Flow consumption
    export function yMapToNode(ymap: Y.Map<any>): GraphNode {
      return {
        id: ymap.get('id'),
        type: ymap.get('type'),
        label: ymap.get('label'),
        position: ymap.get('position'),  // Plain object stored in Y.Map
        metadata: ymap.get('metadata'),   // Plain object stored in Y.Map
        locked: ymap.get('locked'),
        hidden: ymap.get('hidden'),
        created_at: ymap.get('created_at'),
        created_by: ymap.get('created_by'),
      };
    }
    
    // Convert plain object to Y.Map for Yjs storage
    export function nodeToYMap(doc: Y.Doc, node: GraphNode): Y.Map<any> {
      const ymap = new Y.Map();
      doc.transact(() => {
        ymap.set('id', node.id);
        ymap.set('type', node.type);
        ymap.set('label', node.label);
        ymap.set('position', node.position);    // Store as plain object
        ymap.set('metadata', node.metadata);    // Store as plain object
        ymap.set('locked', node.locked);
        ymap.set('hidden', node.hidden);
        ymap.set('created_at', node.created_at);
        ymap.set('created_by', node.created_by);
      });
      return ymap;
    }
    
    // Similar helpers for edges: yMapToEdge, edgeToYMap
    ```
  - Write unit tests for:
    - Adding a node to Y.Map (using nodeToYMap helper)
    - Updating node position (via ymap.set('position', ...))
    - Deleting a node
    - Adding/removing edges
    - Edge cleanup when node deleted
    - Roundtrip conversion: node → Y.Map → node maintains data integrity

  **Must NOT do**:
  - Do not add React components yet
  - Do not add network sync yet (local only)
  - Do not use Y.Array for edges (see Spec Deviations section)

  **Parallelizable**: YES (with Task 5 - different directories)

  **References**:
  - Yjs Y.Map docs: https://docs.yjs.dev/api/shared-types/y.map
  - Spec Deviations section above (authoritative schema)
  - **MVP Identity Model section above** (identity types)

  **Acceptance Criteria**:
  - [ ] `GraphNode` interface matches schema above exactly
  - [ ] `GraphEdge` interface matches schema above exactly
  - [ ] `NodeType` includes all types listed above
  - [ ] `MockUser` and `MockCharacter` interfaces exported from `packages/shared`
  - [ ] `edges` stored as Y.Map (not Y.Array)
  - [ ] Test: `ydoc.getMap('nodes').set('n1', nodeData)` → node exists
  - [ ] Test: Update position → only position key changes
  - [ ] Test: Delete node → node removed, connected edges cleaned up
  - [ ] Test: Edge with deleted source/target is removed
  - [ ] `pnpm test --filter web` → all Yjs tests pass

  **Commit**: YES
  - Message: `feat(shared): add graph entity types and Yjs document structure`
  - Files: `packages/shared/src/types/`, `apps/web/lib/ydoc.ts`, `apps/web/__tests__/ydoc.test.ts`
  - Pre-commit: `pnpm test --filter shared --filter web`

---

- [x] 2. React Flow Integration

  **What to do**:
  - Install React Flow in `apps/web`
  - Install `y-indexeddb` for offline persistence
  - Create `GraphCanvas` component with React Flow
  - Implement Yjs → React Flow sync (observe Y.Map, update React state)
  - Implement React Flow → Yjs sync (onNodesChange → update Y.Map)
  - Wrap updates in `ydoc.transact()` for batching
  - Use `requestAnimationFrame` for batched state updates
  - Enable `onlyRenderVisibleElements={true}` for performance
  - Create custom node components with `React.memo`
  - **Add IndexeddbPersistence** to persist Y.Doc locally (offline-first)

  **Must NOT do**:
  - Do not add network sync yet (still local-only, but persisted to IndexedDB)
  - Do not add presence indicators yet
  - Do not add animated edges

  **Parallelizable**: NO (depends on Task 1)

  **References**:
  - React Flow docs: https://reactflow.dev/docs/getting-started/
  - React Flow state management: https://reactflow.dev/docs/guides/state-management/
  - y-indexeddb: https://github.com/yjs/y-indexeddb
  - Research finding: Use requestAnimationFrame for Yjs observer batching
  - **Yjs + React Flow pattern** (inline for clarity):
    ```typescript
    // Observe Y.Map and sync to React Flow state
    useEffect(() => {
      const nodesMap = ydoc.getMap('nodes');
      const observer = () => {
        requestAnimationFrame(() => {
          setNodes(Array.from(nodesMap.values()).map(yMapToNode));
        });
      };
      nodesMap.observeDeep(observer);
      return () => nodesMap.unobserveDeep(observer);
    }, []);
    ```

  **Acceptance Criteria**:
  - [ ] Canvas renders with pan/zoom (0.1x to 5x range)
  - [ ] Create node via UI → appears in Y.Map
  - [ ] Drag node → position updates in Y.Map
  - [ ] Delete node → removed from Y.Map and canvas
  - [ ] Create edge by dragging between nodes → edge in Y.Map
  - [ ] Test: Rapid position updates don't cause React state thrashing
  - [ ] **Offline test**: Create node → close tab → reopen → node still present
  - [ ] `pnpm dev --filter web` → graph renders at http://localhost:3000

  **Manual Verification**:
  - [ ] Open browser dev tools, verify no console errors during drag
  - [ ] Drag node rapidly for 5 seconds → no dropped frames visible
  - [ ] Check IndexedDB in dev tools → Y.Doc data present

  **Commit**: YES
  - Message: `feat(web): integrate React Flow with Yjs and IndexedDB persistence`
  - Files: `apps/web/components/graph/`, `apps/web/app/page.tsx`
  - Pre-commit: `pnpm test --filter web`

---

- [x] 3. Presence & Awareness

  **What to do**:
  - Implement Yjs Awareness API for ephemeral presence state
  - Create presence data structure: userId, name, color, cursor position, selection
  - Render remote user cursors on canvas
  - Render selection halos (colored border) when remote user selects node
  - Add "user is here" indicator list in UI corner
  - Handle awareness cleanup on disconnect/window unload
  - Use `HocuspocusProvider.awareness` for cross-client presence (requires Task 5 server)

  **Must NOT do**:
  - Do not persist presence to database (ephemeral only)
  - Do not add user avatars/profiles yet

  **Parallelizable**: NO (depends on Task 2 AND Task 5 - needs Hocuspocus for awareness transport)

  **References**:
  - Yjs Awareness docs: https://docs.yjs.dev/api/about-awareness
  - Hocuspocus awareness: https://hocuspocus.dev/guide/awareness
  - PROJECT_BRIEF_v2.md Section 3.2.1 (Presence Y.Awareness)

  **Acceptance Criteria**:
  - [ ] Test: Set local awareness state → state available via `awareness.getStates()`
  - [ ] Test: Remote awareness update triggers observer callback
  - [ ] Open two browser tabs → each sees other's cursor
  - [ ] Select node in Tab A → Tab B shows colored selection halo
  - [ ] Close Tab A → Tab A's cursor disappears from Tab B within 30s
  - [ ] User list shows "2 users online" with both tabs

  **Manual Verification**:
  - [ ] Open two browser windows side by side
  - [ ] Move cursor in window A → cursor indicator moves in window B
  - [ ] Select node in A → B shows selection halo with A's color

  **Commit**: YES
  - Message: `feat(web): add presence awareness with cursors and selection halos`
  - Files: `apps/web/components/graph/Presence.tsx`, `apps/web/lib/awareness.ts`
  - Pre-commit: `pnpm test --filter web`

---

- [x] 4. Persistence Layer

  **What to do**:
  - Create Neon PostgreSQL database (for production deployment)
  - **Note**: Local dev/test/CI use docker-compose postgres. See DATABASE_URL Policy above.
  - **Prerequisite**: Task 5 must be complete (Hocuspocus server running in-memory)
  - **This task modifies** `apps/server/src/ws/hocuspocus.ts` to add `Database` extension
  - Design schema with VARCHAR IDs (generated in-app, NOT Postgres):
    
    > **ID Column Sizes:**
    > - Most entity IDs: `VARCHAR(64)` (prefix + 32-char UUID = ~40 chars, 64 gives headroom)
    > - Document IDs: `VARCHAR(128)` (composite `{campaignId}:{docType}` = ~64+1+16 = ~81 chars max)
    
    ```sql
    -- All IDs generated via packages/shared/src/utils/id.ts
    
    CREATE TABLE campaigns (
      id VARCHAR(64) PRIMARY KEY,           -- generateCampaignId()
      name VARCHAR(255) NOT NULL,
      owner_id VARCHAR(64) NOT NULL,        -- user ID
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE documents (
      id VARCHAR(128) PRIMARY KEY,          -- Composite: {campaignId}:{docType}
                                            -- Max: 64 (campaign) + 1 (:) + 16 (docType) = 81 chars
      campaign_id VARCHAR(64) NOT NULL REFERENCES campaigns(id),
      doc_type VARCHAR(32) NOT NULL,        -- 'graph', 'baseState', 'reputationState'
      yjs_state BYTEA,                      -- Compacted Y.Doc state
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(campaign_id, doc_type)
    );
    
    CREATE TABLE document_updates (
      id VARCHAR(64) PRIMARY KEY,           -- generateId('update')
      doc_id VARCHAR(128) NOT NULL REFERENCES documents(id),  -- Matches documents.id
      update_data BYTEA NOT NULL,           -- Binary Yjs update
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE users (
      id VARCHAR(64) PRIMARY KEY,           -- generateUserId() - matches localStorage
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
    ```
  - **Server-side persistence** (via Hocuspocus hooks, NOT client HTTP POST):
    - Hocuspocus `Database.fetch` loads state from DB on first client connect (see Persistence Architecture)
    - Hocuspocus `onChange` hook writes each incremental update to `document_updates` table
    - **Note**: Do NOT use `store` hook for incremental updates - it receives full state, not deltas
    - `ensureDocumentExists()` handles FK constraints for first-write (see bootstrap.ts in Persistence Architecture)
    - On initial connect: Hocuspocus loads and merges state from DB, syncs to client
  - Implement HTTP fallback endpoint: `GET /api/doc/:campaignId/:docType` → returns merged Yjs state (on Fastify port 3002)
  - Add compaction background job:
    - Runs every 5 minutes
    - Merges `document_updates` into `documents.yjs_state`
    - Deletes compacted update rows
    - Also runs on doc unload (all clients disconnect)

  **Must NOT do**:
  - Do not add client-side HTTP POSTs for updates (redundant with WebSocket)
  - Do not add authentication yet
  - Do not add campaign CRUD UI yet

  **Parallelizable**: NO (depends on Task 5 for Hocuspocus server)

  **References**:
  - Neon docs: https://neon.tech/docs
  - Hocuspocus persistence: https://hocuspocus.dev/guide/persistence
  - Research finding: Store binary updates, periodic compaction
  - Persistence Architecture section above (authoritative flow)
  - **Note**: y-postgresql provider is NOT used; we implement persistence via Drizzle + Hocuspocus hooks

  **Acceptance Criteria**:
  - [ ] `documents` table exists in Neon with BYTEA column
  - [ ] `document_updates` table exists with `id`, `doc_id`, `update_data`, `created_at`
  - [ ] Test: Client edit → server receives via WebSocket → row in `document_updates`
  - [ ] Test: Compaction job merges updates into `documents.yjs_state`
  - [ ] Test: New client connects → receives merged state from DB
  - [ ] Create 3 nodes → refresh page → 3 nodes still present
  - [ ] Two tabs: Tab A creates node → Tab B sees it via WebSocket (not HTTP poll)
  - [ ] `pnpm test --filter server` → persistence tests pass

  **Manual Verification**:
  - [ ] Create nodes, close browser, reopen → nodes persist
  - [ ] (Integration only) Check Neon console → `document_updates` rows visible (requires production DB)

  **Commit**: YES
  - Message: `feat(server): add Yjs persistence to Neon PostgreSQL`
  - Files: `apps/server/src/routes/doc.ts`, `apps/server/src/db/`, `apps/web/lib/sync.ts`
  - Pre-commit: `pnpm test --filter server`

---

- [x] 5. Hocuspocus + Fastify Server

  **What to do**:
  - Initialize two servers in `apps/server`:
    - **Hocuspocus** (port 3001): WebSocket transport for Yjs real-time sync
    - **Fastify** (port 3002): REST API for health checks, doc fallback, knowledge APIs
  - Configure CORS for local development on both
  - Add health check endpoint: `GET /health` on Fastify (port 3002)
  - Hocuspocus handles WebSocket connections directly (no Fastify integration needed)
  - Integrate with web client via `HocuspocusProvider`
  - **IMPORTANT**: In this task, Hocuspocus runs IN-MEMORY ONLY (no Database extension)
  - Documents are ephemeral - lost on server restart (Task 4 adds persistence)
  - See "Server Runtime Topology" in Persistence Architecture for authoritative setup

  **Why Hocuspocus over y-websocket:**
  - Built-in hooks for lifecycle management (used in Task 4)
  - Automatic document cleanup when last client disconnects
  - TypeScript-first with good types
  - See "Persistence Architecture" section for how persistence is added in Task 4

  **Task 5 → Task 4 Handoff:**
  - Task 5 creates: `apps/server/src/ws/hocuspocus.ts` with basic `new Hocuspocus({ port: 3001 })`
  - Task 4 modifies: Same file to add `Database` extension with `fetch` and `onChange` hooks
  - This separation ensures Task 5 can run without database setup

  **Must NOT do**:
  - Do not add authentication yet
  - Do not add Database extension or `onChange` hooks yet (that's Task 4)
  - Do not integrate Hocuspocus into Fastify (they run as separate servers)

  **Parallelizable**: YES (with Task 1 - different directories)

  **References**:
  - Fastify docs: https://fastify.dev/docs/latest/
  - Hocuspocus: https://hocuspocus.dev/
  - Server Runtime Topology section above (authoritative port assignments)

  **Acceptance Criteria**:
  - [ ] `pnpm dev --filter server` starts Hocuspocus on port 3001 AND Fastify on port 3002
  - [ ] `curl http://localhost:3002/health` → `{"status":"ok"}`
  - [ ] Test: HocuspocusProvider connects to `ws://localhost:3001` with document name
  - [ ] Two browser tabs connect → changes sync between them
  - [ ] `pnpm test --filter server` → server tests pass

  **Manual Verification**:
  - [ ] Open two browser tabs to http://localhost:3000
  - [ ] Create node in Tab A → appears in Tab B within 200ms
  - [ ] Drag node in Tab B → position updates in Tab A

  **Commit**: YES
  - Message: `feat(server): add Hocuspocus WebSocket server and Fastify REST API`
  - Files: `apps/server/src/index.ts`, `apps/server/src/ws/hocuspocus.ts`, `apps/server/src/api/`
  - Pre-commit: `pnpm test --filter server`

---

- [x] 6. Graph Polish & Node Styling

  **What to do**:
  - Implement node type-specific styling (icons, colors per NodeType)
  - Add node context menu (right-click): Edit, Delete, Lock, Hide
  - Implement locked node behavior (only GM can move)
  - Implement hidden node behavior (invisible to non-GM)
  - Add edge relationship type selector dropdown
  - Add edge styling (weight → thickness, relation → color)
  - Implement basic undo/redo with Y.UndoManager
  - Add keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y)

  **Must NOT do**:
  - Do not add authentication/roles yet (use ?gm=true for GM mode)
  - Do not add full node detail editor (just basics)

  **Parallelizable**: NO (depends on Tasks 1-5)

  **References**:
  - Y.UndoManager: https://docs.yjs.dev/api/undo-manager
  - PROJECT_BRIEF_v2.md Section 3.3 (Acceptance Criteria LG-01 to LG-06)

  **Acceptance Criteria**:
  - [ ] Each NodeType has distinct icon and color
  - [ ] Right-click node → context menu appears
  - [ ] Lock node → non-GM cannot drag (GM determined by localStorage isGM flag, set via ?gm=true)
  - [ ] Hide node → non-GM cannot see node
  - [ ] Ctrl+Z undoes last action
  - [ ] Ctrl+Y redoes undone action
  - [ ] Brief LG-01 to LG-06 all verified

  **Manual Verification**:
  - [ ] Create nodes of each type → each has unique icon/color
  - [ ] Lock a node, try to drag → should not move
  - [ ] Undo node creation → node disappears
  - [ ] Redo → node reappears

  **Commit**: YES
  - Message: `feat(web): add graph polish, node styling, undo/redo`
  - Files: `apps/web/components/graph/nodes/`, `apps/web/components/graph/ContextMenu.tsx`
  - Pre-commit: `pnpm test --filter web`

---

### Phase 2: Campaign State (Tables)

- [x] 7. Base Resources Table

  **What to do**:
  - Create `BaseResources` component with data grid (React Table or similar)
  - Define Yjs structure: `ydoc.getMap('baseState')` with resources and inventory sub-maps
  - **Note**: Use lowercase `baseState` per DocType naming convention (see "DocType Values" section)
  - Implement Traveller-specific resources: Credits, Ship Fuel, Cargo Space, Maintenance, Life Support
  - Allow GM to add custom resources
  - Implement inline cell editing with Yjs sync
  - Add cell history (right-click → "View History")
  - Add CSV export button

  **Must NOT do**:
  - Do not sync to Foundry yet
  - Do not add complex formulas

  **Parallelizable**: YES (with Task 10 - different apps)

  **References**:
  - PROJECT_BRIEF_v2.md Section 4.1 (Base Resources Table)
  - React Table: https://tanstack.com/table/latest
  - Traveller resources from interview: Credits, Fuel, Cargo, Maintenance, Life Support

  **Acceptance Criteria**:
  - [ ] Table displays 5 core resources with current values
  - [ ] Click cell → inline edit → Yjs updates
  - [ ] Two tabs: Edit in A → B sees change
  - [ ] "Add Resource" button → new row with custom name
  - [ ] Right-click cell → "View History" shows who changed what
  - [ ] "Export CSV" downloads table as .csv file
  - [ ] `pnpm test --filter web` → table tests pass

  **Commit**: YES
  - Message: `feat(web): add base resources table with inline editing`
  - Files: `apps/web/components/tables/BaseResources.tsx`
  - Pre-commit: `pnpm test --filter web`

---

- [x] 8. Reputation & Faction Table

  **What to do**:
  - Create `ReputationTable` component
  - Define Yjs structure: `ydoc.getMap('reputationState')` with factions sub-map
  - **Note**: Use lowercase `reputationState` per DocType naming convention (see "DocType Values" section)
  - Implement fields: FactionID (graph link), Name, Standing (-100 to +100), Tier (computed), Heat, LastChange
  - Color-code Standing cell (red → green gradient)
  - Compute Tier automatically from Standing value
  - Allow linking faction to graph node

  **Must NOT do**:
  - Do not add faction graph navigation yet (Task 9)

  **Parallelizable**: NO (depends on Task 7 for patterns)

  **References**:
  - PROJECT_BRIEF_v2.md Section 4.2 (Reputation & Standing Table)
  - Tier computation: Hostile (<-60), Cold (-60 to -20), Neutral (-20 to +20), Warm (+20 to +60), Allied (>+60)

  **Acceptance Criteria**:
  - [ ] Table shows faction rows with all fields
  - [ ] Standing cell has red-to-green background based on value
  - [ ] Edit Standing → Tier auto-updates
  - [ ] "Link to Graph" shows node picker, stores FactionID
  - [ ] "Add Faction" creates new row
  - [ ] `pnpm test --filter web` → reputation tests pass

  **Commit**: YES
  - Message: `feat(web): add faction reputation table with auto-tier`
  - Files: `apps/web/components/tables/ReputationTable.tsx`
  - Pre-commit: `pnpm test --filter web`

---

- [x] 9. Graph-Table Linking

  **What to do**:
  - Implement "Focus on Graph" action from table row
  - Click faction name → canvas pans to center faction node
  - Implement node detail panel that shows linked table data
  - Click node → side panel shows reputation if faction type
  - Ensure bi-directional link consistency

  **Must NOT do**:
  - Do not add deep editing in panel (link to table for edits)

  **Parallelizable**: NO (depends on Tasks 7, 8)

  **References**:
  - PROJECT_BRIEF_v2.md Section 4.2: "Clicking the Faction Name focuses the camera on the corresponding Faction Node"
  - React Flow: `useReactFlow().fitView()` or `setCenter()`

  **Acceptance Criteria**:
  - [ ] Click faction name in table → graph pans to that node
  - [ ] Node not found → show "Node not linked" toast
  - [ ] Click faction node → side panel shows Standing, Tier, Heat
  - [ ] Link broken (node deleted) → table shows "Unlinked" badge

  **Commit**: YES
  - Message: `feat(web): link graph nodes to table rows with navigation`
  - Files: `apps/web/components/tables/`, `apps/web/components/graph/NodePanel.tsx`
  - Pre-commit: `pnpm test --filter web`

---

### Phase 3: GraphRAG (Knowledge System)

- [x] 10. Python RAG Service Setup

  **What to do**:
  - Initialize FastAPI service in `apps/rag-service`
  - Configure Poetry for dependency management
  - Add health check: `GET /health`
  - Add Pinecone client initialization (with mock for tests)
  - Add OpenAI client for embeddings (with mock for tests)
  - Add Gemini client for LLM (provider-agnostic interface)
  - Create abstract `LLMProvider` class with `generate()` method
  - Implement `GeminiProvider` as first concrete implementation
  - **Create mock implementations for all external services**:
    - `MockPineconeIndex` - returns canned vectors
    - `MockEmbeddings` - returns deterministic 1536-dim vectors
    - `MockGeminiProvider` - returns canned responses
  - Add pytest infrastructure with mock fixtures
  - Add `conftest.py` with `@pytest.fixture` for mocked services

  **Must NOT do**:
  - Do not add ingestion logic yet
  - Do not add retrieval logic yet
  - Do not require API keys for unit tests

  **Parallelizable**: YES (with Task 7 - different apps)

  **References**:
  - FastAPI docs: https://fastapi.tiangolo.com/
  - Pinecone Python: https://docs.pinecone.io/docs/python-client
  - Google Generative AI: https://ai.google.dev/tutorials/python_quickstart
  - External Service Test Strategy section above

  **Acceptance Criteria**:
  - [ ] `cd apps/rag-service && uvicorn main:app` starts on port 8000
  - [ ] `curl http://localhost:8000/health` → `{"status":"ok"}`
  - [ ] Test: `GeminiProvider.generate("Hello")` returns string (mocked)
  - [ ] Test: `embeddings.embed("test")` returns 1536-dim vector (mocked)
  - [ ] `pytest` passes with ≥3 tests (health, llm, embeddings)
  - [ ] Tests pass WITHOUT any API keys set (mocks used)
  - [ ] `conftest.py` has fixtures for all mocked services

  **Commit**: YES
  - Message: `feat(rag-service): initialize FastAPI with LLM provider abstraction and mocks`
  - Files: `apps/rag-service/`
  - Pre-commit: `pytest apps/rag-service/`

---

- [x] 11. Document Ingestion Pipeline

  **What to do**:
  - Create ingestion endpoint: `POST /ingest`
  - Accept PDF or text file upload
  - Implement text chunking (500 tokens per chunk)
  - Extract entities using LLM (characters, locations, factions)
  - Generate embeddings for each chunk (1536-dim via OpenAI)
  - Store in Pinecone with metadata per Scope Tag Specification:
    ```json
    {
      "id": "chunk_{uuid}",
      "values": [...],
      "metadata": {
        "source_id": "doc_{uuid}",
        "access_scope": ["public"],  // Default, updatable via UI
        "entities": ["Captain Zara", "Imperial Navy"],
        "chunk_index": 0
      }
    }
    ```
  - Default access_scope: `["public"]`

  **Must NOT do**:
  - Do not add access scope UI yet (default public, UI in Task 12)
  - Do not add entity linking to graph yet
  - Do not invent scope tag formats (use Scope Tag Specification)

  **Parallelizable**: NO (depends on Task 10)

  **References**:
  - PROJECT_BRIEF_v2.md Section 5.1.1 (Document Ingestion & Tagging)
  - Pinecone upsert: https://docs.pinecone.io/docs/upsert-data
  - LangChain text splitter: https://python.langchain.com/docs/modules/data_connection/document_transformers/
  - **Scope Tag Specification section above** (metadata format)

  **Acceptance Criteria**:
  
  *Unit tests (mocked, no API keys required):*
  - [ ] POST PDF file → returns `{"chunks": 15, "status": "indexed"}` (mocked embeddings + Pinecone)
  - [ ] Test: 1000-word doc → creates ~2 chunks
  - [ ] Test: Each chunk has embedding of 1536 dimensions (mock returns correct shape)
  - [ ] Test: Metadata includes `access_scope: ["public"]`
  
  *Integration tests (requires API keys, run with RUN_INTEGRATION=true):*
  - [ ] Pinecone dashboard shows new vectors with metadata

  **Commit**: YES
  - Message: `feat(rag-service): add document ingestion with chunking and embedding`
  - Files: `apps/rag-service/routers/ingest.py`, `apps/rag-service/services/`
  - Pre-commit: `pytest apps/rag-service/`

---

- [x] 12. Knowledge Gating & Access Control

  **What to do**:
  - **In apps/server**: Create database table `character_knowledge` (see schema in Scope Tag Specification)
  - **In apps/server**: Create database table `ingested_documents` (see "Document Scope Update Flow" section)
  - **In apps/server**: Create REST endpoints:
    - `POST /api/knowledge/grant` - Body: `{ characterId, knowledgeTag }`, Headers: `X-User-Id`
    - `GET /api/knowledge/:characterId` - Returns `{ tags: string[] }`
    - `GET /api/knowledge/scope` - Uses headers to assemble full scope array
    - `PATCH /api/documents/:sourceId/scope` - Updates document scope and propagates to Pinecone
  - **In apps/rag-service**: 
    - On query, call `GET {SERVER_INTERNAL_URL}/api/knowledge/scope` with forwarded headers
    - Use returned scope array in Pinecone filter: `{ "access_scope": { "$in": scope } }`
    - `POST /update-scope` - Updates Pinecone vector metadata for a source document
  - Implement scope assembly function per Scope Tag Specification above
  - Add scope tagging UI in web app for uploaded documents (see "Document Scope Update Flow" section)

  **Must NOT do**:
  - Do not give rag-service direct database access (use REST API)
  - Do not add authentication (mock user/character via headers)
  - Do not invent new scope tag formats (use Scope Tag Specification)

  **Parallelizable**: NO (depends on Task 11)

  **References**:
  - PROJECT_BRIEF_v2.md Section 5.1.2 (Character Knowledge Overlay)
  - PROJECT_BRIEF_v2.md Section 5.1.3 (Retrieval Pipeline)
  - Pinecone filtering: https://docs.pinecone.io/docs/metadata-filtering
  - Database Ownership section above (server owns all tables)
  - **Scope Tag Specification section above** (canonical tag format)
  - **Document Scope Update Flow section above** (Pinecone propagation)
  - **MVP Identity Model section above** (request headers)

  **Acceptance Criteria**:
  - [ ] `character_knowledge` table schema matches Scope Tag Specification (includes CHECK constraint for `secret:%`)
  - [ ] `ingested_documents` table exists with `access_scope` column (per Document Scope Update Flow)
  - [ ] `POST /api/knowledge/grant` with `{ characterId: "char_abc", knowledgeTag: "secret:lost-city" }` → row created
  - [ ] `POST /api/knowledge/grant` with non-secret tag (e.g., `"public"`) → rejected with 400 error
  - [ ] `GET /api/knowledge/:characterId` returns `{ tags: ["secret:lost-city", "secret:traitor-identity"] }`
  - [ ] `GET /api/knowledge/scope` with headers `X-User-Id`, `X-Character-Id`, `X-Is-GM` → returns assembled scope including grants
  - [ ] `PATCH /api/documents/:sourceId/scope` with `{ accessScope: ["gm", "secret:x"] }` → updates DB and Pinecone
  - [ ] Pinecone vectors for that source_id now have updated `access_scope` metadata
  - [ ] Non-GM user → 403 Forbidden when trying to update document scope
  - [ ] RAG service calls `GET /api/knowledge/scope` (verified via server logs or mock)
  - [ ] Test: Pinecone query with `filter: { "access_scope": { "$in": ["public"] } }` → only public chunks
  - [ ] Test: Pinecone query with `filter: { "access_scope": { "$in": ["public", "secret:lost-city"] } }` → includes secret-tagged chunks
  - [ ] Test: GM query (isGM=true) → scope includes `gm`
  - [ ] UI: Document scope editor with tag input:
    - Predefined options: `public`, `gm`, `party`
    - Faction input: dropdown of existing factions → stores as `faction:{factionId}` (display shows name)
    - Secret input: text field for slug → stores as `secret:{slug}`

  **Commit**: YES
  - Message: `feat: add knowledge gating with scope-based filtering`
  - Files: `apps/server/src/routes/knowledge.ts`, `apps/server/src/routes/documents.ts`, `apps/rag-service/routers/knowledge.py`, `apps/rag-service/routers/scope.py`, `apps/web/components/rag/`
  - Pre-commit: `pnpm test --filter server && pytest apps/rag-service/`

---

- [x] 13. RAG Chat Interface

  **What to do**:
  - Create chat UI component in web app
  - Implement query endpoint: `POST /query`
  - Assemble user's allowed scopes
  - Pre-filter Pinecone query
  - Rerank results (optional: cross-encoder)
  - Generate response using Gemini with retrieved context
  - **Stream response via SSE** (Server-Sent Events) - simpler than WebSocket for unidirectional streaming
  - Display "No information found" if no results match scope

  **Streaming Implementation:**
  ```python
  # apps/rag-service/routers/query.py
  from fastapi.responses import StreamingResponse
  
  @router.post("/query")
  async def query(request: QueryRequest):
      # ... retrieve context from Pinecone ...
      
      async def generate():
          async for chunk in gemini_provider.stream(prompt, context):
              yield f"data: {json.dumps({'text': chunk})}\n\n"
          yield "data: [DONE]\n\n"
      
      return StreamingResponse(generate(), media_type="text/event-stream")
  ```
  
  ```typescript
  // apps/web/lib/rag-client.ts
  import { getOrCreateUser, getActiveCharacter } from './identity';
  
  // Browser calls RAG service DIRECTLY (not via Next.js proxy)
  // Identity headers attached per Service URLs Policy
  const RAG_URL = process.env.NEXT_PUBLIC_RAG_URL || 'http://localhost:8000';
  
  async function streamQuery(query: string, onChunk: (text: string) => void) {
    const user = getOrCreateUser();
    const char = getActiveCharacter();
    
    const response = await fetch(`${RAG_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.userId,
        'X-User-Name': user.name,
        'X-Is-GM': String(user.isGM),
        'X-Character-Id': char?.characterId ?? '',
      },
      body: JSON.stringify({ query }),
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        const data = JSON.parse(line.slice(6));
        if (data.text) onChunk(data.text);
      }
    }
  }
  ```

  **Must NOT do**:
  - Do not add conversation history yet
  - Do not add follow-up questions

  **Parallelizable**: NO (depends on Task 12)

  **References**:
  - PROJECT_BRIEF_v2.md Appendix A2.1 (Retrieval Algorithm Pseudocode)
  - PROJECT_BRIEF_v2.md Section 5.2 (Concrete Examples)

  **Acceptance Criteria**:
  
  *Unit tests (mocked, no API keys required):*
  - [ ] Chat UI shows input box and message history
  - [ ] Test: Query with mock scope → correct filter passed to Pinecone mock
  - [ ] Test: Empty results from Pinecone → "You do not recall any information" response
  - [ ] Test: Scope filtering verified with mock data (different scopes return different chunks)
  - [ ] Test: Response generation uses retrieved context (verify mock LLM receives chunks)
  
  *Integration tests (requires API keys, run with RUN_INTEGRATION=true):*
  - [ ] Query "What is the City of Brass?" → returns public lore from Pinecone
  - [ ] Query secret without knowledge → "You do not recall any information"
  - [ ] Grant knowledge → same query now returns secret
  - [ ] Response streams word-by-word via SSE (verify with `curl -N` showing incremental output)

  **Manual Verification**:
  - [ ] As Player, query GM-only secret → "No information"
  - [ ] As GM, query same secret → full answer
  - [ ] Grant knowledge to player → player now sees answer

  **Commit**: YES
  - Message: `feat: add RAG chat interface with knowledge-gated retrieval`
  - Files: `apps/web/components/chat/`, `apps/rag-service/routers/query.py`
  - Pre-commit: `pnpm test && pytest apps/rag-service/`

---

### Phase 4: Foundry VTT Integration

- [x] 14. Foundry Bridge Module Setup

  **What to do**:
  - Initialize Foundry module in `packages/foundry-module`
  - Create `module.json` with manifest (id: `plane-shift-bridge`)
  - Create basic module.js with Hooks.once("init") and Hooks.once("ready")
  - Add configuration settings:
    - PlaneShift server URL (text field)
    - API key (text field) - **MVP behavior: stored but NOT validated by server**
  - Add socket connection setup on ready
  - Test module loads in Foundry VTT with mgt2e world

  > **MVP API Key Behavior:**
  > The API key setting exists for future authentication but is NOT enforced in MVP.
  > - Foundry module sends API key via JSON `handshake` message (see Foundry Bridge Transport Protocol)
  > - **NOT via HTTP header** - WebSocket clients cannot set custom headers reliably cross-browser
  > - Server logs receipt but does NOT validate (accepts any value, including empty)
  > - Full validation deferred to post-MVP when auth system is implemented
  > - This allows testing sync without security infrastructure

  **Must NOT do**:
  - Do not add sync logic yet
  - Do not modify mgt2e system
  - Do not implement API key validation (placeholder only)

  **Parallelizable**: NO (depends on Phase 3 completion for full integration)

  **References**:
  - Foundry module development: https://foundryvtt.wiki/en/development/guides/
  - mgt2e repo: https://github.com/Mongoose-Publishing/traveller-foundryvtt
  - Foundry V12/V13 manifest: https://foundryvtt.com/article/module-development/

  **Acceptance Criteria**:
  - [ ] `module.json` has valid schema for Foundry V12+
  - [ ] Module appears in Foundry "Add-on Modules" list
  - [ ] Enable module → console shows "PlaneShift Bridge initialized"
  - [ ] Settings → PlaneShift → server URL field exists
  - [ ] WebSocket connection attempt logged (may fail without server)

  **Manual Verification**:
  - [ ] Create mgt2e test world in Foundry
  - [ ] Install plane-shift-bridge module
  - [ ] Enable module → no console errors
  - [ ] Open settings → PlaneShift config visible

  **Commit**: YES
  - Message: `feat(foundry-module): initialize plane-shift-bridge module`
  - Files: `packages/foundry-module/`
  - Pre-commit: N/A (Foundry module, manual test)

---

- [x] 15. Foundry → PlaneShift Sync

  **What to do**:
  - Implement Hooks.on("updateActor") to detect changes
  - **MVP default: Sync ALL player-owned actors** (actors where `actor.hasPlayerOwner === true`)
  - This includes all party members without requiring configuration
  - Future: Add settings UI to exclude specific actors if needed
  - Construct change payload: actor ID, changed fields, timestamp
  - Send via WebSocket to PlaneShift server
  - Server receives → updates corresponding graph node
  - Map mgt2e actor fields to PlaneShift node metadata
  
  **Actor Filtering Logic:**
  ```javascript
  // packages/foundry-module/src/sync.js
  Hooks.on("updateActor", (actor, changes, options, userId) => {
    // Only sync player-owned actors (party members)
    if (!actor.hasPlayerOwner) return;
    
    // Only sync if this client made the change (avoid echo)
    if (userId !== game.user.id) return;
    
    // Extract whitelisted fields only
    const payload = buildSyncPayload(actor, changes);
    if (payload) {
      bridge.send({ type: 'actor_update', payload });
    }
  });
  ```

  **Must NOT do**:
  - Do not add conflict resolution yet
  - Do not sync items (actors only for MVP)

  **Parallelizable**: NO (depends on Task 14)

  **References**:
  - PROJECT_BRIEF_v2.md Appendix A3.2 (The "Push" - Foundry → Web)
  - mgt2e Actor schema: `actor.system.characteristics`, `actor.system.skills`
  - Foundry API docs: https://foundryvtt.com/api/ (navigate to Hooks class)
  - Foundry community wiki: https://foundryvtt.wiki/en/development/api/hooks
  - **Foundry Bridge Transport Protocol section above** (message format, field mapping)

  **Acceptance Criteria**:
  - [ ] Change actor HP in Foundry → PlaneShift node metadata updates
  - [ ] Server logs received update with actor ID and changes
  - [ ] Graph node shows updated HP value (in metadata panel)
  - [ ] Only player-owned actors (`hasPlayerOwner === true`) trigger sync
  - [ ] NPC actors owned only by GM do NOT trigger sync
  - [ ] Timestamp included in payload

  **Manual Verification**:
  - [ ] In Foundry, change traveller actor's HP
  - [ ] In PlaneShift, check corresponding node → HP matches
  - [ ] Check server logs → update event logged

  **Commit**: YES
  - Message: `feat(foundry-module): sync actor changes from Foundry to PlaneShift`
  - Files: `packages/foundry-module/src/sync.js`, `apps/server/src/routes/foundry.ts`
  - Pre-commit: `pnpm test --filter server`

---

- [x] 16. PlaneShift → Foundry Sync

  **What to do**:
  - Server detects changes to Foundry-linked nodes
  - Server pushes change payload to Foundry module via WebSocket
  - Module receives payload → calls `actor.update(data)`
  - Map PlaneShift metadata back to mgt2e actor fields
  - Handle errors (actor locked, permission denied)

  **Must NOT do**:
  - Do not sync arbitrary fields (whitelist safe fields)
  - Do not allow overwriting GM-locked actors

  **Parallelizable**: NO (depends on Task 15)

  **References**:
  - PROJECT_BRIEF_v2.md Appendix A3.3 (The "Pull" - Web → Foundry)
  - Foundry actor.update(): https://foundryvtt.com/api/Actor.html#update

  **Acceptance Criteria**:
  - [ ] Change node metadata in PlaneShift → Foundry actor updates
  - [ ] Module logs "Received update command for actor X"
  - [ ] Foundry actor sheet shows new values
  - [ ] Locked actor → update rejected, error logged
  - [ ] Only whitelisted fields sync (per Field Mapping table: `system.hits.*`, `system.characteristics.*`, `system.finance.cash`, `name`)

  **Manual Verification**:
  - [ ] In PlaneShift, edit traveller node's HP metadata
  - [ ] In Foundry, refresh actor sheet → HP matches
  - [ ] Try to update locked actor → error shown

  **Commit**: YES
  - Message: `feat(foundry-module): sync changes from PlaneShift to Foundry actors`
  - Files: `packages/foundry-module/src/receive.js`
  - Pre-commit: N/A (manual test)

---

- [ ] 17. Conflict Resolution

  **What to do**:
  - Implement conflict detection: same field changed in both systems
  
  **Conflict Detection Data Model:**
  
  > **How we detect "same field changed in both systems":**
  
  ```typescript
  // apps/server/src/conflicts/types.ts
  
  interface SyncState {
    nodeId: string;           // PlaneShift node ID
    foundryUuid: string;      // Linked Foundry actor UUID
    fields: {
      [fieldPath: string]: {  // e.g., "metadata.hp.current"
        value: unknown;
        lastFoundrySync: Date;   // When last synced FROM Foundry
        lastPlaneshiftSync: Date; // When last synced FROM PlaneShift
      };
    };
  }
  
  interface IncomingChange {
    source: 'foundry' | 'planeshift';
    fieldPath: string;
    newValue: unknown;
    timestamp: Date;          // When change was made (client-side)
  }
  
  // Conflict detection algorithm:
  function detectConflict(state: SyncState, incoming: IncomingChange): boolean {
    const field = state.fields[incoming.fieldPath];
    if (!field) return false;  // New field, no conflict
    
    const lastSync = incoming.source === 'foundry' 
      ? field.lastFoundrySync 
      : field.lastPlaneshiftSync;
    
    const oppositeLastSync = incoming.source === 'foundry'
      ? field.lastPlaneshiftSync
      : field.lastFoundrySync;
    
    // Conflict = opposite side changed AFTER our last sync of that field
    // AND incoming change is not more recent than opposite side's change
    const CONFLICT_WINDOW_MS = 5000;  // 5 second window
    return (
      oppositeLastSync > lastSync &&
      Math.abs(incoming.timestamp.getTime() - oppositeLastSync.getTime()) < CONFLICT_WINDOW_MS
    );
  }
  ```
  
  **Database Table:**
  ```sql
  CREATE TABLE sync_state (
    id VARCHAR(64) PRIMARY KEY,
    node_id VARCHAR(64) NOT NULL REFERENCES nodes(id),
    foundry_uuid VARCHAR(255) NOT NULL,
    field_path VARCHAR(255) NOT NULL,
    current_value JSONB,
    last_foundry_sync TIMESTAMP,
    last_planeshift_sync TIMESTAMP,
    UNIQUE(node_id, field_path)
  );
  
  CREATE TABLE conflict_queue (
    id VARCHAR(64) PRIMARY KEY,
    node_id VARCHAR(64) NOT NULL,
    field_path VARCHAR(255) NOT NULL,
    foundry_value JSONB,
    planeshift_value JSONB,
    foundry_timestamp TIMESTAMP,
    planeshift_timestamp TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, resolved, dismissed
    resolved_by VARCHAR(64),
    resolved_at TIMESTAMP,
    resolution VARCHAR(20),  -- 'keep_foundry', 'keep_planeshift', 'manual'
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
  
  - Apply Conflict Matrix rules from brief:
    - GM vs Player → GM wins
    - Player vs Player → LWW
    - Foundry vs Web (stats) → Foundry authoritative
    - Foundry vs Web (notes) → Merge or conflict queue
  - Create "Conflict Queue" UI for unresolvable conflicts
  - GM can choose: Keep Server / Keep Incoming / Manual Merge
  - Log all conflict resolutions

  **Must NOT do**:
  - Do not auto-resolve semantic conflicts (require GM review)

  **Parallelizable**: NO (depends on Tasks 15, 16)

  **References**:
  - PROJECT_BRIEF_v2.md Section 6.2 (The Conflict Matrix)
  - PROJECT_BRIEF_v2.md Section 6.3 (The "Conflict Queue" UX)

  **Acceptance Criteria**:
  - [ ] Simultaneous edits → conflict detected
  - [ ] GM edit vs Player edit → GM version kept, player notified
  - [ ] Divergent text → Conflict Queue item created
  - [ ] GM reviews conflict → chooses resolution → conflict cleared
  - [ ] Resolution logged with timestamp and action taken
  - [ ] Test: Conflict Matrix rules verified

  **Commit**: YES
  - Message: `feat: add conflict resolution with Conflict Queue UI`
  - Files: `apps/web/components/conflicts/`, `apps/server/src/conflicts/`
  - Pre-commit: `pnpm test`

---

- [ ] 18. Manual Fallback Mode

  **What to do**:
  - Implement "Import from Foundry JSON" in web app
  - Parse Foundry actor JSON, match to graph nodes by name/UUID
  - Update matched nodes with imported data
  - Implement "Export to Foundry JSON" in web app
  - Generate Foundry-compatible JSON for actors and journals
  - Provide download as ZIP file
  - Document runbook in README

  **Must NOT do**:
  - Do not auto-import (require explicit user action)

  **Parallelizable**: NO (depends on sync logic understanding)

  **References**:
  - PROJECT_BRIEF_v2.md Section 7.2 (Manual Fallback Mode - The "Runbook")
  - PROJECT_BRIEF_v2.md Appendix A4 (Manual Fallback Runbook)

  **Acceptance Criteria**:
  - [ ] Upload actors.json → matched actors updated, report shown
  - [ ] Unmatched actors → listed in report, not imported
  - [ ] Export → downloads ZIP with actor JSONs
  - [ ] Import exported ZIP to Foundry → actors created
  - [ ] README documents manual sync procedure

  **Commit**: YES
  - Message: `feat(web): add manual import/export fallback for Foundry sync`
  - Files: `apps/web/components/settings/ImportExport.tsx`, `apps/server/src/routes/export.ts`
  - Pre-commit: `pnpm test`

---

- [ ] 19. E2E Testing & Polish

  **What to do**:
  - Add Playwright E2E tests for critical flows:
    - Graph CRUD with two users
    - Table editing with sync
    - RAG query with knowledge gating
  - Performance testing: 500 nodes, 10 concurrent users
  - Fix any discovered issues
  - Add loading states and error boundaries
  - Add toast notifications for sync status
  - Review and update README with setup instructions

  **Must NOT do**:
  - Do not add new features
  - Do not optimize prematurely

  **Parallelizable**: NO (final task)

  **References**:
  - PROJECT_BRIEF_v2.md Section 10.1 (Quality Assurance)
  - PROJECT_BRIEF_v2.md Appendix A6 (Performance Targets)
  - Playwright: https://playwright.dev/
  - **Performance Measurement Procedures section above** (how to measure latency and FPS)

  **Acceptance Criteria**:
  - [ ] Playwright tests pass for graph, tables, RAG
  - [ ] 500 nodes render at 60fps (use Chrome DevTools Performance tab per "Render Performance Measurement" section)
  - [ ] 10 concurrent users edit without data loss
  - [ ] Sync latency <200ms for graph updates (use Playwright test or awareness timestamps per "Sync Latency Measurement" section)
  - [ ] All error states have user-friendly messages
  - [ ] README has complete setup instructions
  - [ ] `pnpm test && pnpm e2e` passes
  - [ ] E2E tests include `sync-latency.spec.ts` and `performance.spec.ts` from Performance Measurement Procedures

  **Commit**: YES
  - Message: `test: add E2E tests and polish for MVP release`
  - Files: `apps/web/e2e/`, `README.md`
  - Pre-commit: `pnpm test && pnpm e2e`

---

## Commit Strategy

| After Task | Message | Key Files |
|------------|---------|-----------|
| 0 | `chore: initialize monorepo` | turbo.json, pnpm-workspace.yaml |
| 1 | `feat(shared): add graph types and Yjs structure` | packages/shared/ |
| 2 | `feat(web): integrate React Flow with Yjs` | apps/web/components/graph/ |
| 3 | `feat(web): add presence awareness` | apps/web/lib/awareness.ts |
| 4 | `feat(server): add Yjs persistence to Neon` | apps/server/src/db/ |
| 5 | `feat(server): add Hocuspocus and Fastify servers` | apps/server/ |
| 6 | `feat(web): add graph polish and undo/redo` | apps/web/components/graph/ |
| 7 | `feat(web): add base resources table` | apps/web/components/tables/ |
| 8 | `feat(web): add reputation table` | apps/web/components/tables/ |
| 9 | `feat(web): link graph and tables` | apps/web/components/ |
| 10 | `feat(rag-service): initialize FastAPI` | apps/rag-service/ |
| 11 | `feat(rag-service): add document ingestion` | apps/rag-service/routers/ |
| 12 | `feat(rag-service): add knowledge gating` | apps/rag-service/ |
| 13 | `feat: add RAG chat interface` | apps/web/components/chat/ |
| 14 | `feat(foundry-module): initialize bridge` | packages/foundry-module/ |
| 15 | `feat(foundry-module): Foundry → PlaneShift sync` | packages/foundry-module/ |
| 16 | `feat(foundry-module): PlaneShift → Foundry sync` | packages/foundry-module/ |
| 17 | `feat: add conflict resolution` | apps/web/components/conflicts/ |
| 18 | `feat(web): add manual import/export` | apps/web/components/settings/ |
| 19 | `test: add E2E tests and polish` | apps/web/e2e/ |

---

## Success Criteria

### Verification Commands
```bash
# All tests pass
pnpm test

# E2E tests pass
pnpm e2e

# Build succeeds
pnpm build

# Type check passes
pnpm typecheck

# Python tests pass
pytest apps/rag-service/
```

### Final Checklist
- [ ] Multiple users can simultaneously edit graph with <200ms sync (verified per "Sync Latency Measurement" procedure)
- [ ] Graph persists to database and survives reload
- [ ] RAG queries respect character knowledge permissions
- [ ] Foundry module syncs actor changes bidirectionally
- [ ] Conflict Queue allows GM to resolve sync conflicts
- [ ] Manual import/export works as fallback
- [ ] 500 nodes render at 60fps (verified per "Render Performance Measurement" procedure)
- [ ] All "Must Have" requirements met
- [ ] All "Must NOT Have" guardrails respected
