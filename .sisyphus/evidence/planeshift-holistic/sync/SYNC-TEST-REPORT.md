# Multi-User Sync Test Report

**Date:** 2026-01-27  
**Test Suite:** PlaneShift Holistic Verification - Sync Tests M1-M4  
**Status:** ❌ FAILED - Infrastructure Blocker

---

## Executive Summary

Multi-user sync tests **CANNOT be executed** due to a database authentication failure in the Hocuspocus WebSocket server. The server fails to connect to PostgreSQL, which prevents document synchronization between connected clients.

### Key Findings

| Metric          | Value                                    |
| --------------- | ---------------------------------------- |
| Tests Attempted | 4                                        |
| Tests Passed    | 0                                        |
| Tests Failed    | 1                                        |
| Tests Blocked   | 3                                        |
| Root Cause      | Database authentication misconfiguration |

---

## Root Cause Analysis

### Symptom

- User A creates a node → visible on User A's screen
- User B does NOT see the node (sync fails)
- Awareness (presence badges) WORKS - both users see each other
- Document sync FAILS - changes don't propagate

### Technical Root Cause

**Error in Hocuspocus server logs:**

```
[onLoadDocument] password authentication failed for user "ezotoff"
PostgresError: password authentication failed for user "ezotoff"
```

**Expected configuration (from `.env`):**

```
DATABASE_URL=postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test
```

**Actual behavior:**

- The `DATABASE_URL` environment variable is NOT being loaded
- The `postgres` library defaults to connecting as the OS user (`ezotoff`) without a password
- PostgreSQL rejects the connection

### Why This Happens

1. `apps/server/src/db/client.ts` uses `process.env.DATABASE_URL!`
2. The dev script (`tsx watch src/index.ts`) does NOT load `.env` files
3. No `dotenv` package is configured to load environment variables
4. The connection string is `undefined`, causing postgres to use default credentials

### Why Awareness Works But Document Sync Fails

- **Awareness** uses a lightweight in-memory protocol on the WebSocket
- **Document sync** requires the Database extension to fetch document state from PostgreSQL
- When `fetch()` fails, Hocuspocus closes the WebSocket for that document
- The awareness protocol operates independently and continues working

---

## Test Results Detail

### M1: Node Creation Syncs

**Status:** ❌ FAILED  
**Expected:** User A creates node → User B sees node within 500ms  
**Actual:** User B never sees the node  
**Latency:** N/A (sync never occurred)

**Evidence:**

- `sync-01-node-creation-A.png` - Shows User A with 1 node visible
- `sync-01-node-creation-B.png` - Shows User B with 0 nodes, but sees User A's presence

### M2: Node Drag Syncs

**Status:** 🚫 BLOCKED  
**Reason:** Cannot test - prerequisite M1 failed

### M3: Node Deletion Syncs

**Status:** 🚫 BLOCKED  
**Reason:** Cannot test - prerequisite M1 failed

### M4: Conflict Resolution

**Status:** 🚫 BLOCKED  
**Reason:** Cannot test - prerequisite M1 failed

---

## Remediation Required

To enable sync testing, fix the environment variable loading:

### Option 1: Add dotenv to server

```bash
pnpm --filter server add dotenv
```

Then in `src/index.ts`:

```typescript
import 'dotenv/config';
// ... rest of code
```

### Option 2: Use tsx with env-file flag

```json
{
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts"
  }
}
```

### Option 3: Export DATABASE_URL before running

```bash
export DATABASE_URL="postgresql://planeshift:planeshift_dev@localhost:5432/planeshift_test"
pnpm --filter server dev
```

---

## Evidence Files

| File                             | Description                           |
| -------------------------------- | ------------------------------------- |
| `sync-01-node-creation-A.png`    | User A's view after creating a node   |
| `sync-01-node-creation-B.png`    | User B's view - node not synced       |
| `sync-latency-measurements.json` | Detailed test results and diagnostics |

---

## Conclusion

**Multi-user sync is BROKEN in the current deployment configuration.**

While the WebSocket connection establishes and awareness works (users can see each other's presence), the actual document synchronization fails because the Hocuspocus server cannot authenticate with PostgreSQL.

This is a **critical bug** that prevents the core real-time collaboration feature from functioning.

### Priority: CRITICAL

### Impact: All real-time collaboration features non-functional

### Recommendation: Fix environment variable loading before proceeding with further sync testing
