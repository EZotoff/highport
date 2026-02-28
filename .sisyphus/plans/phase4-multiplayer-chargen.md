# Phase A4: Multiplayer Chargen - Implementation Plan

> **Status**: COMPLETE
> **Completed**: 2026-02-01
> **Estimated effort**: 3-4 days
> **Depends on**: Phase A2 (Single-Player Chargen) - COMPLETE

---

## Overview

This phase transforms single-player character generation into a collaborative "Session Zero" experience where:

1. Multiple players generate characters simultaneously in the same session
2. Players see each other's progress in real-time
3. Spawned NPCs/locations form a shared pool visible to all
4. Players can "claim connections" to entities spawned by others
5. GM has moderation controls over the session

---

## Architecture Decisions

### Session Model

- **Shared CRDT State**: All chargen data in single Y.Doc, partitioned by character ID
- **Presence Integration**: Use existing Hocuspocus awareness for "who is where"
- **NPC Pool**: Centralized map of all spawned entities, visible to all participants

### Real-Time Visibility

- Players see a sidebar/panel showing other participants' current status
- Entity spawns trigger notifications to all participants
- Connection requests are visible to entity creator and GM

### Ownership Model

| Entity Type      | Default Owner   | Can Transfer To       |
| ---------------- | --------------- | --------------------- |
| Character        | Creating Player | GM only               |
| Spawned NPC      | GM              | Any player (for crew) |
| Spawned Location | GM              | N/A                   |
| Spawned Item     | Creating Player | Other players         |

---

## Task Breakdown

### Task 1: Shared Chargen Session State

**Effort**: Medium (2-3 hours)

Extend CRDT schema to support multiple simultaneous characters.

**Files to modify:**

- [x] `apps/web/lib/chargen/types.ts` - Add session-level types
- [x] `apps/web/lib/chargen/state.ts` - Add session management functions
- [x] `apps/web/lib/chargen/hooks.ts` - Add session-aware hooks

**Schema Extension:**

```typescript
// Session-level state (in Y.Doc)
interface ChargenSession {
  id: string;
  campaignId: string;
  createdAt: number;
  createdBy: string; // GM user ID
  status: 'active' | 'completed' | 'abandoned';

  // All characters being generated
  characters: Y.Map<string, ChargenCharacter>; // charId → character

  // Shared entity pool
  entityPool: Y.Map<string, SpawnedEntity>; // entityId → entity

  // Connection requests between entities
  connectionRequests: Y.Array<ConnectionRequest>;

  // Session settings
  settings: {
    allowedCareers: string[]; // Which careers are enabled
    aiVerbosity: 'minimal' | 'structured' | 'rich';
    requireGMApproval: boolean; // For entity spawns
  };
}

interface SpawnedEntity {
  id: string;
  type: 'npc' | 'location' | 'item' | 'secret';
  createdBy: string; // User ID who spawned
  createdFor: string; // Character ID it was spawned for
  createdDuring: { termNumber: number; eventRoll: number };
  ownedBy: string; // 'gm' or user ID

  // Entity data
  name: string;
  metadata: Record<string, unknown>;

  // Claimed connections
  claimedBy: string[]; // Character IDs that have claimed this entity
}

interface ConnectionRequest {
  id: string;
  requesterId: string; // User ID requesting
  requesterCharId: string; // Character ID requesting
  entityId: string; // Entity being claimed
  relationship: string; // 'ally' | 'contact' | 'rival' | etc.
  status: 'pending' | 'approved' | 'rejected';
  note?: string; // Player's reason for connection
}
```

**Session Management Functions:**

```typescript
// Create new chargen session
function createSession(doc: Y.Doc, campaignId: string, gmUserId: string): string;

// Join existing session
function joinSession(doc: Y.Doc, sessionId: string, userId: string): void;

// Get all characters in session
function getSessionCharacters(doc: Y.Doc): ChargenCharacter[];

// Get entity pool
function getEntityPool(doc: Y.Doc): SpawnedEntity[];

// Submit connection request
function requestConnection(
  doc: Y.Doc,
  charId: string,
  entityId: string,
  relationship: string,
): void;

// Approve/reject connection (GM only)
function resolveConnectionRequest(doc: Y.Doc, requestId: string, approved: boolean): void;
```

**Acceptance criteria:**

- [x] Session can be created with unique ID
- [x] Multiple characters can exist in same session
- [x] Entity pool shared across all participants
- [x] Connection requests stored and retrievable

---

### Task 2: Participant Awareness Panel

**Effort**: Medium (2-3 hours)

Show real-time status of all participants in the chargen session.

**Files to create:**

- [x] `apps/web/components/chargen/ParticipantPanel.tsx`
- [x] `apps/web/components/chargen/ParticipantCard.tsx`
- [x] `apps/web/lib/chargen/useParticipants.ts`

**UI Design:**

```
┌─ SESSION PARTICIPANTS ──────────────────────────────┐
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 👤 Alice (GM)                          Watching ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 🎲 Bob - "Marcus Chen"                          ││
│  │    Navy (Line/Crew) - Term 2                    ││
│  │    ████████░░ 80% complete                      ││
│  │    [View Progress]                              ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 🎲 Carol - "Zara Okonkwo"                       ││
│  │    Scout (Explorer) - Term 1                    ││
│  │    ████░░░░░░ 40% complete                      ││
│  │    Currently rolling event...                   ││
│  │    [View Progress]                              ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ ⏳ Dave - Not started                           ││
│  │    [Waiting to begin...]                        ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Awareness Integration:**

```typescript
// Update awareness with chargen progress
awareness.setLocalStateField('chargen', {
  characterName: 'Marcus Chen',
  career: 'navy',
  assignment: 'line_crew',
  term: 2,
  step: 'event_resolution',
  progressPercent: 80,
});
```

**Acceptance criteria:**

- [x] Panel shows all session participants
- [x] Real-time updates as participants progress
- [x] GM shown with distinct indicator
- [x] Progress percentage calculated correctly
- [ ] "View Progress" opens read-only preview

---

### Task 3: Entity Pool View

**Effort**: Medium (2-3 hours)

Display all spawned entities from the session.

**Files to create:**

- [x] `apps/web/components/chargen/EntityPoolPanel.tsx`
- [x] `apps/web/components/chargen/EntityPoolCard.tsx`
- [x] `apps/web/lib/chargen/useEntityPool.ts`

**UI Design:**

```
┌─ SPAWNED ENTITIES ──────────────────────────────────┐
│  Filter: [All ▼] [NPCs] [Locations] [Items]         │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 👤 Lt. Cmdr Vasquez (NPC)                       ││
│  │    Rival of Marcus Chen                         ││
│  │    Created by: Bob (Term 1)                     ││
│  │    ─────────────────────────────────────────────││
│  │    "A bitter officer who blames Marcus for..."  ││
│  │                                                 ││
│  │    [Request Connection] [View Details]          ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 📍 Starport Sigma (Location)                    ││
│  │    Created by: Carol (Term 2)                   ││
│  │    ─────────────────────────────────────────────││
│  │    "A frontier starport on the edge of..."      ││
│  │                                                 ││
│  │    [Request Connection] [View Details]          ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ 👤 Admiral Chen (NPC)                           ││
│  │    Ally of Zara Okonkwo                         ││
│  │    Created by: Carol (Term 1)                   ││
│  │    ─────────────────────────────────────────────││
│  │    Connection claimed by: Marcus ✓              ││
│  │                                                 ││
│  │    [View Details]                               ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Real-time Updates:**

- New entities appear with animation/notification
- Claimed entities show who claimed them
- Filter by type or creator

**Acceptance criteria:**

- [x] All spawned entities visible to all participants
- [x] Entities update in real-time as created
- [x] Filter by type works correctly
- [x] "Request Connection" triggers connection flow
- [x] Claimed connections visible

---

### Task 4: Connection Request Flow

**Effort**: Medium (2-3 hours)

Allow players to claim connections to entities spawned by others.

**Files to create:**

- [x] `apps/web/components/chargen/ConnectionRequestModal.tsx`
- [x] `apps/web/components/chargen/ConnectionRequestList.tsx`
- [x] `apps/web/lib/chargen/useConnectionRequests.ts`

**Request Flow:**

```
Player A spawns NPC "Vasquez" as their rival
           │
           ▼
Player B sees Vasquez in Entity Pool
           │
           ▼
Player B clicks "Request Connection"
           │
           ▼
┌─ REQUEST CONNECTION ────────────────────────────────┐
│                                                     │
│  Connect to: Lt. Cmdr Vasquez                       │
│  Original: Rival of Marcus Chen                     │
│                                                     │
│  Your relationship:                                 │
│  ┌─────────────────────────────────────────────────┐│
│  │ [Contact ▼]                                     ││
│  │   • Ally                                        ││
│  │   • Contact  ← Selected                         ││
│  │   • Rival                                       ││
│  │   • Former colleague                            ││
│  │   • Custom...                                   ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  How do you know them?                              │
│  ┌─────────────────────────────────────────────────┐│
│  │ We served together on the ISS Resolute before   ││
│  │ their falling out with Marcus. I still respect  ││
│  │ their tactical mind, even if others don't.      ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  [Cancel] [Submit Request]                          │
└─────────────────────────────────────────────────────┘
           │
           ▼
GM (or entity owner) sees request
           │
           ▼
┌─ PENDING REQUESTS (GM View) ────────────────────────┐
│                                                     │
│  Carol wants to connect to Vasquez                  │
│  Relationship: Contact                              │
│  Note: "We served together on the ISS Resolute..."  │
│                                                     │
│  [Approve] [Reject] [Ask for clarification]         │
└─────────────────────────────────────────────────────┘
           │
           ▼
On approval: Edge created in graph
```

**Acceptance criteria:**

- [x] Connection request modal with relationship selector
- [x] Request stored in CRDT state
- [x] GM sees pending requests
- [x] Approval creates graph edge
- [x] Rejection notifies requester
- [x] Multiple characters can claim same entity

---

### Task 5: Real-Time Notifications

**Effort**: Low (1-2 hours)

Notify participants of key events during the session.

**Files to create:**

- [x] `apps/web/components/chargen/ChargenNotifications.tsx`
- [x] `apps/web/lib/chargen/useChargenNotifications.ts`

**Notification Types:**

```typescript
type ChargenNotification =
  | { type: 'player_joined'; playerName: string }
  | { type: 'character_started'; playerName: string; characterName: string }
  | { type: 'entity_spawned'; entityName: string; entityType: string; creatorName: string }
  | { type: 'connection_requested'; requesterName: string; entityName: string }
  | { type: 'connection_approved'; entityName: string; characterName: string }
  | { type: 'character_completed'; playerName: string; characterName: string }
  | { type: 'term_completed'; playerName: string; termNumber: number };
```

**UI Design:**

```
┌─────────────────────────────────────────────────────┐
│ 🔔 Carol created NPC: Admiral Chen                  │ ← Toast
│    [View in Pool]                              [×]  │
└─────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] Toast notifications for entity spawns
- [x] Notifications for player actions
- [x] Click notification to navigate to relevant UI
- [x] Notifications can be dismissed
- [x] Notification history viewable

---

### Task 6: GM Moderation Controls

**Effort**: Medium (2-3 hours)

Give GM tools to manage the chargen session.

**Files to create:**

- [x] `apps/web/components/chargen/GMControlPanel.tsx`
- [x] `apps/web/lib/chargen/useGMControls.ts`

**GM Controls:**

```
┌─ GM CONTROLS ───────────────────────────────────────┐
│                                                     │
│  Session Settings:                                  │
│  ┌─────────────────────────────────────────────────┐│
│  │ Allowed Careers:                                ││
│  │ ☑ Navy  ☑ Army  ☑ Marines  ☑ Scout             ││
│  │ ☑ Merchant  ☑ Agent  ☐ Noble  ☐ Rogue          ││
│  │ ☑ Scholar  ☑ Entertainer  ☑ Drifter  ☑ Citizen ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │ ☐ Require GM approval for entity spawns        ││
│  │ ☑ Allow cross-player connections               ││
│  │ ☐ Lock session (no new participants)           ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Pending Approvals: (3)                             │
│  ┌─────────────────────────────────────────────────┐│
│  │ • Carol → Vasquez connection [Approve] [Reject]││
│  │ • Bob's NPC "Dr. Vance" [Approve] [Edit] [Reject]│
│  │ • Dave → Admiral Chen connection [Approve] [Reject]│
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Session Actions:                                   │
│  [End Session] [Export All Characters]              │
└─────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] GM can toggle allowed careers
- [x] GM can require approval for spawns
- [x] Pending requests queue visible
- [x] Approval/rejection triggers appropriate updates
- [x] Session can be ended by GM

---

### Task 7: Session Join Flow

**Effort**: Low (1-2 hours)

Allow players to join an existing chargen session.

**Files to create:**

- [x] `apps/web/components/chargen/SessionJoinModal.tsx`
- [x] `apps/web/app/chargen/join/[sessionId]/page.tsx`

**Join Flow:**

1. GM creates session, gets shareable link: `/chargen/join/abc123`
2. Players open link
3. Join modal confirms participation
4. Player added to session participants
5. Player can start character generation

**UI Design:**

```
┌─ JOIN CHARGEN SESSION ──────────────────────────────┐
│                                                     │
│  Campaign: "The Spinward Marches"                   │
│  GM: Alice                                          │
│                                                     │
│  Current Participants: 3                            │
│  • Bob - Creating "Marcus Chen"                     │
│  • Carol - Creating "Zara Okonkwo"                  │
│  • Dave - Not started                               │
│                                                     │
│  Your Name: [Player Name_________]                  │
│                                                     │
│  [Cancel] [Join Session]                            │
└─────────────────────────────────────────────────────┘
```

**Acceptance criteria:**

- [x] Shareable join link works
- [x] Join modal shows session info
- [x] Player added to participants on join
- [x] Existing participants see join notification

---

## Agentic Browser Testing

### Critical Path Testing

After implementation, execute multi-browser verification:

#### Test 1: Multi-Player Session Creation and Join

```
Browser A (GM):
1. Navigate to http://localhost:3010/chargen
2. Click "Create New Session" (or start creating character as GM)
3. Note the session ID from URL
4. Verify session controls visible (GM panel)

Browser B (Player 1):
5. Navigate to http://localhost:3010/chargen/join/{sessionId}
6. Enter player name, click "Join Session"
7. Verify joined successfully
8. Verify appears in Browser A's participant panel

Browser C (Player 2):
9. Join same session
10. Verify both players visible in all browsers
```

#### Test 2: Real-Time Progress Visibility

```
Browser A (GM): Watching
Browser B (Player 1): Creating character

In Browser B:
1. Start character creation (background step)
2. Complete background step

In Browser A:
3. Verify Player 1's progress updates in real-time
4. Verify progress bar shows ~20%

In Browser B:
5. Continue to career selection
6. Select Navy career, qualify

In Browser A:
7. Verify career shows in participant card
8. Verify progress updates

In Browser B:
9. Complete term 1 with event that spawns NPC

In Browser A + C:
10. Verify NPC appears in Entity Pool panel
11. Verify notification toast appears
```

#### Test 3: Entity Pool and Connection Request

```
Browser B: Creates NPC "Vasquez" as rival
Browser C: Requests connection to Vasquez

In Browser C:
1. Open Entity Pool panel
2. Find "Vasquez" card
3. Click "Request Connection"
4. Select relationship: "Contact"
5. Enter note: "We served together before"
6. Submit request

In Browser A (GM):
7. Verify pending request appears in GM panel
8. Click "Approve"

In Browser C:
9. Verify approval notification
10. Verify connection now shows on Vasquez card

In Graph View (any browser):
11. Navigate to /graph
12. Verify edge exists between Player C's character and Vasquez
```

#### Test 4: GM Moderation Controls

```
Browser A (GM):

1. Open GM Control Panel
2. Disable "Noble" and "Rogue" careers
3. Verify save confirmation

In Browser B:
4. Start career selection
5. Verify Noble and Rogue are not available

In Browser A:
6. Enable "Require GM approval for entity spawns"
7. Save settings

In Browser B:
8. Create character, reach event that spawns NPC
9. Fill NPC details, submit

In Browser A:
10. Verify pending approval in GM panel
11. Edit NPC name slightly
12. Click Approve

In Browser B:
13. Verify NPC appears with GM's edit
14. Verify notification of approval
```

#### Test 5: Session Completion

```
All Browsers:

1. Complete characters in Browser B and C
2. Both finalize characters

In Browser A (GM):
3. Click "End Session"
4. Verify confirmation dialog
5. Confirm end

All Browsers:
6. Verify session marked as complete
7. Verify redirect to graph view or session summary
8. Verify all characters visible as graph nodes
9. Verify all connections and spawned entities in graph
```

### Exploratory Testing Scenarios

#### Scenario A: Race Conditions

```
Browser B and C simultaneously:
1. Both players spawn NPCs at the same moment
2. Verify both NPCs appear in entity pool
3. Verify no data corruption
4. Both request connection to same entity
5. Verify both requests appear in GM queue
6. GM approves both
7. Verify entity has multiple connections
```

#### Scenario B: Disconnection Recovery

```
Browser B:
1. Start character creation
2. Progress to term 2
3. Disconnect network (browser offline)
4. Continue making progress locally
5. Reconnect network
6. Verify all progress syncs to other browsers
7. Verify no duplicate entities
```

#### Scenario C: Late Joiner

```
Browsers A, B:
1. Create session, Browser B creates character through term 2
2. Spawn 3 NPCs

Browser C:
3. Join session late
4. Verify can see all existing participants
5. Verify can see all 3 spawned NPCs in pool
6. Verify can request connections to existing NPCs
7. Start own character creation
8. Verify appears in other browsers
```

#### Scenario D: Large Session (5+ participants)

```
1. Create session with 5 browsers
2. All create characters simultaneously
3. Monitor for:
   - Performance degradation
   - UI responsiveness
   - Sync latency
   - Memory usage
4. All spawn NPCs
5. Verify entity pool handles 10+ entities
6. All complete characters
7. Verify graph handles all nodes/edges
```

### Browser Testing Evidence Collection

For each test, capture:

1. **Multi-browser screenshots** - Show all browsers side-by-side
2. **Sync verification** - Same data visible in all browsers
3. **Timing** - Measure sync latency (should be <500ms)
4. **Console logs** - No errors in any browser

Save evidence to: `.sisyphus/evidence/phase4-multiplayer/`

---

## Verification Checklist

After implementation, verify:

- [x] Sessions can be created and joined
- [x] Multiple characters in same session work correctly
- [x] Real-time participant visibility working
- [x] Entity pool shared and updated in real-time
- [x] Connection requests flow through properly
- [x] GM controls function correctly
- [x] Notifications appear for key events
- [x] No race conditions with simultaneous actions
- [x] Reconnection handles gracefully
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes
- [x] Multi-browser tests pass with evidence captured

---

## Testing Strategy

### Unit Tests

- [x] Session state management functions
- [x] Connection request logic
- [x] Entity pool filtering

### Integration Tests

- [x] CRDT sync with multiple documents
- [x] Awareness state propagation
- [x] GM permission checks

### E2E Tests (via Browser Automation)

- [x] Full multiplayer session flow
- [x] Connection request approval flow
- [x] GM moderation flow

---

## Dependencies

- **Phase A2 Complete**: Single-player chargen works
- **Hocuspocus Server**: Running for real-time sync
- **Presence System**: Existing awareness implementation

---

## Blocks

Completing this phase:

- Enables full "Session Zero" experience
- Provides foundation for Phase A5 (Lifepath Visualization with shared history)
- Prepares for future co-GM features
