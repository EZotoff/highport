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

