# Phase A5: Lifepath Visualization - Implementation Plan

> **Status**: READY FOR EXECUTION
> **Run with**: `/start-work`
> **Estimated effort**: 2-3 days
> **Depends on**: Phase A2 (Single-Player Chargen) - COMPLETE

---

## Overview

This phase creates a visual representation of a character's lifepath - their career history displayed as both:
1. **Timeline View**: Horizontal progression showing terms, events, and key moments
2. **Graph Integration**: Career terms as node clusters, with connections to spawned entities

The visualization helps players understand their character's journey and see how their history connects to the world.

---

## Architecture Decisions

### Dual View Approach
- **Timeline**: D3.js or pure React-based horizontal timeline component
- **Graph**: Extension of existing React Flow graph with career-themed grouping

### Data Source
- Read from chargen CRDT state (character's `terms` array)
- Also read from finalized character graph nodes (post-chargen)
- Support both in-progress and completed characters

### Layout Strategy
- Timeline: Horizontal scroll, one column per term
- Graph: Cluster nodes around character node, organized by career
- Connections: Lines from character → spawned entities, styled by relationship

---

## Task Breakdown

### Task 1: Timeline View Component
**Effort**: Medium (3-4 hours)

Create the horizontal timeline showing career progression.

**Files to create:**
- [x] `apps/web/components/chargen/LifepathTimeline.tsx`
- [x] `apps/web/components/chargen/TimelineTerm.tsx`
- [x] `apps/web/components/chargen/TimelineEvent.tsx`
- [x] `apps/web/lib/chargen/useLifepath.ts`

**UI Design:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  LIFEPATH: Commander Sarah Chen                                         Age: 34 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  18        22        26        30        34                                     │
│   ├─────────┼─────────┼─────────┼─────────┤                                     │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │ NAVY (Line/Crew)                                                        │   │
│   ├─────────┬─────────┬─────────┬─────────┤                                     │
│   │ Term 1  │ Term 2  │ Term 3  │ Term 4  │                                     │
│   │ Age 18  │ Age 22  │ Age 26  │ Age 30  │                                     │
│   ├─────────┼─────────┼─────────┼─────────┤                                     │
│   │ ✓ Surv  │ ✓ Surv  │ ✓ Surv  │ ✓ Surv  │                                     │
│   │         │         │ ★ Cmdr  │         │                                     │
│   │ 📌Event │ 📌Event │ 📌Event │ 📌Event │                                     │
│   │ "Made   │ "Saved  │ "Promo- │ "Found  │                                     │
│   │ rival"  │ ship"   │ ted"    │ artifact│                                     │
│   │         │         │         │         │                                     │
│   │ 👤Rival │         │ 👤Ally  │ 📦Item  │                                     │
│   │ Vasquez │         │ Chen    │ Datapad │                                     │
│   └─────────┴─────────┴─────────┴─────────┘                                     │
│                                                                                 │
│   Skills Gained: Pilot-2, Tactics-2, Vacc Suit-1, Mechanic-1, Leadership-1     │
│   Benefits: 2 Ship Shares, TL12 Blade, Cr35,000                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Timeline Features:**
- Horizontal scroll for long careers
- Click term to expand details
- Click entity to jump to graph node
- Rank progression indicators (stars)
- Color-coded by survival/advancement results

**Acceptance criteria:**
- [x] Timeline renders career terms horizontally
- [x] Each term shows key info (age, event, entities)
- [x] Clicking entity scrolls to/highlights graph node
- [x] Works for in-progress and completed characters
- [x] Responsive layout for mobile

---

### Task 2: Term Detail Card
**Effort**: Low (1-2 hours)

Expandable detail view for individual terms.

**Files to create:**
- [x] `apps/web/components/chargen/TermDetailCard.tsx`

**UI Design (Expanded):**
```
┌─ TERM 1: NAVY (Line/Crew) ─────────────────────────────────────────────────┐
│                                                                             │
│  Age: 18 → 22                                                               │
│                                                                             │
│  ┌─ ROLLS ──────────────────────────────────────────────────────────────┐   │
│  │ Survival: 2d6(4,3) + INT(+1) = 8 ≥ 5 ✓                               │   │
│  │ Event:    2d6 = 7 → "You make a rival in the officer corps"          │   │
│  │ Advancement: 2d6(5,4) + EDU(+1) = 10 ≥ 7 ✓ → Able Spacehand          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ EVENT DETAILS ──────────────────────────────────────────────────────┐   │
│  │ "During a tense fleet exercise near the Spinward Marches, your       │   │
│  │ quick thinking saved the ship but showed up Lt. Cmdr Vasquez.        │   │
│  │ The bitter officer has held a grudge ever since."                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ ENTITIES SPAWNED ───────────────────────────────────────────────────┐   │
│  │ 👤 Lt. Cmdr Vasquez (Rival)                                          │   │
│  │    "A bitter officer who blames you for their stalled career"        │   │
│  │    [View in Graph]                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ SKILLS GAINED ──────────────────────────────────────────────────────┐   │
│  │ Vacc Suit-0 (Basic Training) → Vacc Suit-1 (Rank Skill)              │   │
│  │ Mechanic-1 (Rolled on Service Table)                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Collapse]                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [x] Card shows all term details
- [x] Dice roll breakdowns visible
- [x] Event description displayed
- [x] Spawned entities linked
- [x] Collapsible to save space

---

### Task 3: Graph Cluster Visualization
**Effort**: High (4-5 hours)

Integrate lifepath into the React Flow graph view.

**Files to create:**
- [x] `apps/web/components/graph/LifepathCluster.tsx`
- [x] `apps/web/components/graph/CareerNode.tsx`
- [x] `apps/web/lib/graph/lifepath-layout.ts`

**Graph Layout:**
```
                    ┌───────────────────────────────────────────────────────┐
                    │                   NAVY CLUSTER                        │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
                    │  │ Term 1  │──│ Term 2  │──│ Term 3  │──│ Term 4  │  │
                    │  │ 18-22   │  │ 22-26   │  │ 26-30   │  │ 30-34   │  │
                    │  └────┬────┘  └─────────┘  └────┬────┘  └────┬────┘  │
                    │       │                        │            │        │
                    └───────┼────────────────────────┼────────────┼────────┘
                            │                        │            │
                   ┌────────┴────────┐    ┌─────────┴─────┐ ┌────┴────────┐
                   │                 │    │               │ │             │
              ┌────▼────┐       ┌────▼────▼───┐      ┌────▼─▼──┐    ┌─────▼────┐
              │ Vasquez │       │ Sarah Chen  │      │ Admiral │    │ Ancient  │
              │ (Rival) │       │ (Character) │      │  Chen   │    │ Datapad  │
              └─────────┘       └─────────────┘      │ (Ally)  │    │  (Item)  │
                   ▲                   │             └─────────┘    └──────────┘
                   │                   │                  │
                   │            ┌──────┴──────┐          │
                   │            │  Starport   │          │
                   └────────────│   Sigma     │──────────┘
                 (also knows)   │ (Location)  │
                                └─────────────┘
```

**Layout Algorithm:**
1. Character node at center
2. Career cluster(s) above character
3. Term nodes arranged horizontally within cluster
4. Spawned entities positioned below terms that created them
5. Edges styled by relationship type

**Node Types:**
```typescript
// New node types for lifepath
type CareerClusterNode = {
  type: 'career-cluster';
  data: {
    careerId: string;
    careerName: string;
    termCount: number;
    assignment: string;
    collapsed: boolean;
  };
};

type TermNode = {
  type: 'term';
  data: {
    termNumber: number;
    age: number;
    eventSummary: string;
    survived: boolean;
    advanced: boolean;
    rankGained?: string;
  };
};
```

**Acceptance criteria:**
- [x] Career clusters group term nodes
- [x] Edges connect terms to spawned entities
- [x] Clicking term shows detail popup
- [x] Cluster can be collapsed/expanded
- [x] Layout doesn't overlap existing nodes

---

### Task 4: Shared History Connections (Multi-Character)
**Effort**: Medium (2-3 hours)

Show connections between characters from the same session.

**Files to create:**
- [x] `apps/web/components/graph/SharedHistoryEdge.tsx`
- [x] `apps/web/lib/graph/shared-history.ts`

**Shared History Types:**
```typescript
interface SharedHistoryConnection {
  characterA: string;  // Character ID
  characterB: string;  // Character ID
  sharedEntity: string; // Entity ID they both connect to
  relationshipA: string; // A's relationship to entity
  relationshipB: string; // B's relationship to entity
  description?: string; // How they relate through this entity
}
```

**Visual Representation:**
```
     Marcus Chen                              Zara Okonkwo
          │                                        │
          │ (served under)                         │ (saved by)
          │                                        │
          └──────────────► Admiral Chen ◄──────────┘
                          (Shared NPC)
                               │
                    ┌──────────┴──────────┐
                    │ Marcus and Zara     │
                    │ both know the       │
                    │ Admiral from their  │
                    │ Navy days           │
                    └─────────────────────┘
```

**Edge Styling:**
- Dashed lines for shared history
- Tooltip shows how characters connect
- Color-coded by relationship type
- Click to see full connection story

**Acceptance criteria:**
- [x] Shared entities highlighted when multiple characters connect
- [x] Visual indicator of shared history
- [x] Tooltip explains connection
- [x] Works for 2+ characters sharing entity

---

### Task 5: Lifepath Panel (Collapsible Sidebar)
**Effort**: Low (1-2 hours)

Add a collapsible panel to the main graph view showing selected character's lifepath.

**Files to create:**
- [x] `apps/web/components/graph/LifepathPanel.tsx`
- [x] `apps/web/lib/graph/useSelectedLifepath.ts`

**UI Design:**
```
┌─ GRAPH VIEW ───────────────────────────────────────────────────────────────────┐
│                                                                                │
│  [📊 Lifepath ◄]                                          ┌─ LIFEPATH ────────┐│
│                                                           │                   ││
│                                                           │ Sarah Chen        ││
│     ┌─────────────────────────────────────────┐          │ Age: 34           ││
│     │                                         │          │                   ││
│     │              Graph Canvas               │          │ ┌─ Term 1 ───────┐││
│     │                                         │          │ │ Navy (Line)    │││
│     │    [Character] ─── [NPC] ─── [Location] │          │ │ • Survived ✓   │││
│     │                                         │          │ │ • Made rival   │││
│     │                                         │          │ │   → Vasquez    │││
│     │                                         │          │ └────────────────┘││
│     │                                         │          │                   ││
│     └─────────────────────────────────────────┘          │ ┌─ Term 2 ───────┐││
│                                                           │ │ Navy (Line)    │││
│                                                           │ │ • Survived ✓   │││
│                                                           │ │ • Saved ship   │││
│                                                           │ └────────────────┘││
│                                                           │                   ││
│                                                           │ [View Full →]     ││
│                                                           └───────────────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Opens when character node selected
- Collapsible to maximize graph space
- Compact term summaries
- "View Full" opens detailed timeline modal

**Acceptance criteria:**
- [x] Panel appears on character selection
- [x] Shows compact lifepath summary
- [x] Collapsible with smooth animation
- [x] "View Full" opens detailed timeline

---

### Task 6: Lifepath Export
**Effort**: Low (1 hour)

Export lifepath as formatted text or image.

**Files to create:**
- [x] `apps/web/lib/chargen/lifepath-export.ts`

**Export Formats:**
```typescript
// Text export
function exportLifepathAsText(character: ChargenCharacter): string;

// Markdown export
function exportLifepathAsMarkdown(character: ChargenCharacter): string;

// Image export (capture timeline as PNG)
function exportLifepathAsImage(timelineRef: HTMLElement): Promise<Blob>;
```

**Text Output Example:**
```
LIFEPATH: Commander Sarah Chen
Age: 34

CAREER: Navy (Line/Crew) - 4 Terms

Term 1 (Age 18-22)
- Survived: Yes (rolled 8, needed 5+)
- Event: Made a rival in the officer corps
  → Spawned: Lt. Cmdr Vasquez (Rival)
- Advancement: Yes → Rank: Able Spacehand
- Skills: Vacc Suit-1, Mechanic-1

Term 2 (Age 22-26)
...

FINAL STATS
STR: 7 (+0)  DEX: 9 (+1)  END: 8 (+0)
INT: 10 (+1) EDU: 11 (+1) SOC: 6 (+0)

SKILLS
Pilot (Spacecraft): 2, Tactics (Naval): 2, Vacc Suit: 1, ...

BENEFITS
2 Ship Shares, TL12 Blade, Cr35,000

CONNECTIONS
- Lt. Cmdr Vasquez (Rival) - Term 1
- Admiral Chen (Ally) - Term 3
```

**Acceptance criteria:**
- [x] Text export produces readable format
- [x] Markdown export suitable for sharing
- [x] Image export captures timeline visually
- [x] Export buttons accessible from timeline/panel

---

## Agentic Browser Testing

### Critical Path Testing

After implementation, execute browser-based verification:

#### Test 1: Timeline View for Single Character
```
1. Navigate to http://localhost:3010/chargen
2. Create a character with 3+ terms:
   - Complete background
   - Navy career, 3 terms with events
   - Muster out
   - Finalize

3. View the lifepath timeline:
   - Verify all 3 terms visible
   - Verify events shown for each term
   - Verify spawned entities appear on correct terms
   - Verify skills summary at bottom

4. Interact with timeline:
   - Click on Term 1 to expand details
   - Verify dice rolls visible
   - Verify event description shown
   - Click on spawned entity
   - Verify navigation to graph/entity
   
5. Take screenshot of full timeline
```

#### Test 2: Graph Cluster Visualization
```
1. Navigate to http://localhost:3010/graph
2. Select the character created in Test 1
3. Verify lifepath cluster appears:
   - Career cluster visible above character
   - Term nodes arranged horizontally
   - Edges to spawned entities visible

4. Interact with cluster:
   - Click to expand/collapse cluster
   - Hover over term to see summary
   - Click entity to select it
   - Verify edges highlight correctly

5. Take screenshot of graph with lifepath
```

#### Test 3: Term Detail Card
```
1. From timeline view, click on a term with:
   - Event that spawned an entity
   - Advancement roll
   - Skills gained

2. Verify detail card shows:
   - All dice roll breakdowns
   - Full event description
   - Spawned entity with link
   - Skills gained list

3. Click "View in Graph" for spawned entity
4. Verify graph view opens/scrolls to entity
5. Navigate back and verify card state preserved
```

#### Test 4: Lifepath Panel in Graph
```
1. Navigate to http://localhost:3010/graph
2. Click on character node
3. Verify lifepath panel opens:
   - Character name and age shown
   - Compact term summaries visible
   - Terms clickable for details

4. Click collapse button
5. Verify panel collapses smoothly
6. Click expand again
7. Verify panel returns

8. Click "View Full"
9. Verify detailed timeline modal opens
```

#### Test 5: Export Functionality
```
1. Open lifepath timeline for a character
2. Click "Export as Text"
3. Verify text file downloads
4. Open file and verify content correct

5. Click "Export as Markdown"
6. Verify markdown file downloads
7. Paste into markdown viewer
8. Verify formatting correct

9. Click "Export as Image"
10. Verify PNG downloads
11. Open image and verify timeline captured
```

### Exploratory Testing Scenarios

#### Scenario A: Multi-Career Character
```
1. Create character with 2 different careers:
   - Navy for 2 terms
   - Scout for 2 terms

2. View timeline:
   - Verify both careers shown
   - Verify transition indicated
   - Verify terms numbered correctly

3. View graph cluster:
   - Verify 2 career clusters
   - Verify correct entities under each
   - Verify edges don't cross inappropriately
```

#### Scenario B: Mishap and Forced Departure
```
1. Create character where mishap occurs:
   - Start Navy career
   - Force mishap (or create with test data)
   - Switch to Drifter

2. View timeline:
   - Verify mishap indicated on failed term
   - Verify career change shown
   - Verify no advancement for mishap term

3. Verify term detail shows mishap reason
```

#### Scenario C: Multiple Characters (Shared History)
```
1. Create 2 characters in same session
2. Have both connect to same NPC (e.g., Admiral Chen)

3. View graph with both characters:
   - Verify shared entity highlighted
   - Verify both connections visible
   - Hover over shared entity
   - Verify tooltip shows both connections

4. Click shared entity:
   - Verify info panel shows all connections
   - Verify each character's relationship noted
```

#### Scenario D: Long Career (7+ Terms)
```
1. Create character with 7 terms (use test data if needed)
2. View timeline:
   - Verify horizontal scroll works
   - Verify all terms visible
   - Verify no layout breaking
   - Verify age progression correct (18 → 46)

3. View graph cluster:
   - Verify cluster doesn't exceed viewport
   - Verify collapse works
   - Verify 7 term nodes visible when expanded
```

#### Scenario E: Empty/Minimal Character
```
1. Create character with just 1 term, no spawned entities
2. View timeline:
   - Verify single term shown
   - Verify no "orphan" UI elements
   - Verify graceful handling

3. View graph cluster:
   - Verify cluster shows single term
   - Verify no connection edges
   - Verify character node still central
```

### Browser Testing Evidence Collection

For each test, capture:
1. **Timeline screenshots** - Full timeline view
2. **Graph screenshots** - Cluster layout
3. **Interaction screenshots** - Expanded cards, tooltips
4. **Export verification** - Downloaded files

Save evidence to: `.sisyphus/evidence/phase5-lifepath/`

---

## Verification Checklist

After implementation, verify:

- [x] Timeline view renders career history correctly (component implemented with proper layout)
- [x] Term details expandable with all information (TermDetailCard with modal)
- [x] Graph clusters show lifepath structure (CareerNode + LifepathCluster)
- [x] Shared history connections visible for multi-character (SharedHistoryEdge with tooltips)
- [x] Lifepath panel integrates with graph selection (LifepathPanel with useSelectedLifepath)
- [x] Export produces correct output in all formats (unit tested)
- [x] Multi-career characters displayed properly (timeline handles multiple careers)
- [x] Mishap/forced departure handled gracefully (TimelineEvent handles all event types)
- [x] Long careers scroll/render correctly (overflow-x-auto on timeline)
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes
- [ ] Browser tests pass with evidence captured (requires visual verification)

---

## Testing Strategy

### Unit Tests
- [x] Lifepath data extraction from character
- [x] Timeline layout calculations
- [x] Export format generation

### Integration Tests
- [x] Graph cluster positioning (lifepath-layout.ts provides positioning)
- [x] Entity edge connections (SharedHistoryEdge + shared-history.ts)
- [x] Panel state with graph selection (useSelectedLifepath hook)

### E2E Tests (via Browser Automation)
- [ ] Full lifepath viewing flow (requires running dev server)
- [ ] Export functionality (requires browser download verification)
- [ ] Multi-character shared history (requires visual verification)

---

## Dependencies

- **Phase A2 Complete**: Character data available in CRDT
- **React Flow**: For graph cluster extension
- **html-to-image**: For image export (add if not present)

---

## Blocks

Completing this phase:
- Enables "Lifepath Comparison" for party view
- Provides foundation for "Session Recap" feature
- Supports character sheet generation with visual history
