# Learnings - PlaneShift MVP

> Conventions, patterns, and best practices discovered during implementation

## 2026-01-26 Task 0: Monorepo Setup

### Package Versions (Verified Working Together)
- Next.js: ^14.0.0 (14.2.35 installed)
- @hocuspocus/server: ^2.0.0 (2.15.3 installed)
- @hocuspocus/provider: ^2.0.0 (2.15.3 installed)
- drizzle-orm: ^0.38.0 (must match drizzle-kit version)
- drizzle-kit: ^0.28.0 
- yjs: ^13.6.0 (13.6.29 via pnpm overrides - single version)
- vitest: ^1.0.0

### Project Structure Patterns
- `apps/web` - Next.js 14 App Router with Vitest
- `apps/server` - Fastify + Hocuspocus + Drizzle (ESM, "type": "module")
- `apps/rag-service` - FastAPI (Python)
- `packages/shared` - TypeScript types, exported via subpath imports

### Import Pattern for @planeshift/shared
```typescript
import { generateUserId } from '@planeshift/shared/utils/id';
import { GraphNode, MockUser } from '@planeshift/shared/types';
import { DEFAULT_CAMPAIGN_ID } from '@planeshift/shared/constants';
```

### Drizzle ORM Configuration
- `drizzle.config.ts` uses `dialect: 'postgresql'`
- Schema file: `src/db/schema.ts`
- Migrations output: `drizzle/` directory
- Commands: `db:generate`, `db:migrate`, `db:studio`

### TypeScript Patterns
- All packages use strict mode
- Server uses `"module": "ESNext"` with `"moduleResolution": "bundler"`
- Shared package uses composite: true for project references

### Testing
- Vitest configured in both apps/web and apps/server
- Tests in `__tests__/` directories
- `pnpm test` runs across all packages via Turborepo

## 2026-01-27 Task 1: Yjs Document Structure & Types

### Y.Map Behavior
- Y.Map instances cannot read/write until attached to a Y.Doc
- Creating a Y.Map with `new Y.Map()` creates a detached instance
- Must use `doc.getMap('name')` to get an attached Y.Map or add it to a doc before reading

### Yjs Conversion Pattern (nested Y.Map)
Nodes/edges stored as nested Y.Map inside parent maps:
```typescript
const nodes = doc.getMap('nodes');  // Y.Map<string, Y.Map>
const edges = doc.getMap('edges');  // Y.Map<string, Y.Map>
```

Each entity's fields stored in its own Y.Map:
```typescript
ymap.set('id', node.id);
ymap.set('position', { x, y });  // Plain object, not nested Y.Map
```

### Edge Cleanup Pattern
When deleting a node, iterate edges and delete connected ones in same transaction:
```typescript
doc.transact(() => {
  nodes.delete(nodeId);
  edges.forEach((edgeYMap, edgeId) => {
    if (edgeYMap.get('source_id') === nodeId || edgeYMap.get('target_id') === nodeId) {
      edgesToDelete.push(edgeId);
    }
  });
  for (const edgeId of edgesToDelete) edges.delete(edgeId);
});
```

### Test Structure for Yjs
- Use `createYDoc()` in beforeEach for fresh doc per test
- Add entities via helper functions (addNode, addEdge) to attach to doc
- Read back via yMapToNode/yMapToEdge for roundtrip validation
