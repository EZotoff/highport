# SHARED (TypeScript Types & Utilities)

## OVERVIEW

Shared types and utilities used by both web and server packages.

## STRUCTURE

- `src/types/` - TypeScript interfaces
  - `graph.ts` - GraphNode, GraphEdge interfaces
  - `identity.ts` - User identity types
  - `index.ts` - Re-exports
- `src/utils/` - Utility functions
  - `id.ts` - UUID generation (generateNodeId, generateUserId)
- `src/constants.ts` - Shared constants

## KEY TYPES

| Type        | Location          | Role                      |
| ----------- | ----------------- | ------------------------- |
| `GraphNode` | types/graph.ts    | Node in lifepath graph    |
| `GraphEdge` | types/graph.ts    | Edge connecting nodes     |
| `MockUser`  | types/identity.ts | User identity for testing |

## IMPORT PATTERN

Use subpath exports, NOT internal paths:

```typescript
// ✅ CORRECT
import { GraphNode } from '@highport/shared/types';
import { generateNodeId } from '@highport/shared/utils/id';

// ❌ WRONG
import { GraphNode } from '@highport/shared/src/types/graph';
```

## BUILDING

Run: `pnpm --filter @highport/shared build`
Must build before other packages can use types.
