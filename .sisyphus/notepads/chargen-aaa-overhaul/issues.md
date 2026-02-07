
## Issue: Pre-existing tw-animate-css Import Error (RESOLVED)

**Date**: 2026-02-02
**Task**: 1.2 Install shadcn Components

**Problem**: 
- Build was failing with error: `Can't resolve 'tw-animate-css' in '/home/ezotoff/AI_projects/traveller/apps/web/app'`
- Import statement `@import "tw-animate-css";` existed in `apps/web/app/globals.css` line 5
- Package was NOT in package.json dependencies

**Root Cause**:
- Leftover import from a removed or never-installed package
- Pre-existing issue not related to shadcn installation

**Resolution**:
- Removed line 5: `@import "tw-animate-css";` from globals.css
- Build now passes successfully

**Verification**:
- ✅ `pnpm --filter web typecheck` passes
- ✅ `pnpm --filter web build` passes (9 routes compiled successfully)

