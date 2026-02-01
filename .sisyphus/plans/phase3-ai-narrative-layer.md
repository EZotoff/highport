# Phase A3: AI Narrative Layer - Implementation Plan

> **Status**: ✅ COMPLETE
> **Run with**: `/start-work`
> **Estimated effort**: 2-3 days
> **Depends on**: Phase A2 (Single-Player Chargen) - COMPLETE
> **Completed**: 2026-02-01
> **AI Testing Verified**: 2026-02-01 (with Gemini 2.0 Flash)

---

## Overview

This phase adds AI-powered narrative assistance to the character generation flow. The AI:
1. Generates thematic event descriptions based on career context
2. Creates NPC personalities, motivations, and appearances
3. Suggests connections between spawned entities
4. Operates at configurable verbosity levels (minimal → structured → rich)

---

## Architecture Decisions

### AI Model Selection
- **Creative generation** (event prose, NPC backstories): **Gemini 2.0 Flash** or configurable
- **Structured extraction** (parsing, classification): **GPT-4o-mini** or configurable
- All AI calls go through the existing `apps/rag-service/` Python backend

### Verbosity Levels
| Level | Description | Use Case |
|-------|-------------|----------|
| **Minimal** | Just names and types | Player writes everything |
| **Structured** | Key fields filled (name, motivation, 1-liner) | Quick generation |
| **Rich** | Full prose descriptions, personality traits, appearance | Immersive experience |

### Integration Points
- New API endpoint in `apps/rag-service/` for narrative generation
- Frontend calls via fetch from chargen components
- Caching of generated content in CRDT state

---

## Task Breakdown

### Task 1: Narrative Generation API Endpoint
**Effort**: Medium (2-3 hours)

Create the backend API for AI-powered narrative generation.

**Files to create:**
- [x] `apps/rag-service/routers/narrative.py` - FastAPI router
- [x] `apps/rag-service/services/narrative_generator.py` - Core generation logic
- [x] `apps/rag-service/schemas/narrative.py` - Pydantic models

**API Endpoints:**
```python
# POST /api/narrative/event-description
# Generates thematic description for a career event

# Request:
{
  "event_text": "You make a rival in the officer corps",
  "career": "navy",
  "assignment": "line_crew",
  "term": 1,
  "character_context": {
    "name": "Zara",
    "characteristics": {"STR": 7, "DEX": 9, ...},
    "prior_events": ["Joined navy at 18", ...]
  },
  "verbosity": "structured"  # minimal | structured | rich
}

# Response:
{
  "description": "During a tense fleet exercise...",
  "suggested_entities": [
    {
      "type": "npc",
      "relationship": "rival",
      "suggested_name": "Lt. Cmdr Vasquez",
      "suggested_motivation": "Passed over for promotion..."
    }
  ]
}
```

```python
# POST /api/narrative/npc-details
# Generates full NPC personality and backstory

# Request:
{
  "npc_type": "rival",
  "context": {
    "event_text": "You make a rival in the officer corps",
    "career": "navy",
    "character_name": "Zara"
  },
  "existing_fields": {
    "name": "Lt. Cmdr Vasquez"  # User-provided
  },
  "verbosity": "rich"
}

# Response:
{
  "name": "Lt. Cmdr Vasquez",
  "personality": "Cold, calculating, never forgets a slight...",
  "motivation": "Believes Zara's family connections...",
  "appearance": "Tall, sharp features, always immaculate uniform...",
  "quirks": ["Taps fingers when annoyed", "Speaks in clipped sentences"]
}
```

**Acceptance criteria:**
- [x] `/api/narrative/event-description` endpoint working
- [x] `/api/narrative/npc-details` endpoint working
- [x] Verbosity levels produce different output lengths
- [x] Errors handled gracefully (API key missing, rate limits)

---

### Task 2: Frontend Narrative Hooks
**Effort**: Low (1-2 hours)

Create React hooks for calling the narrative API.

**Files to create:**
- [x] `apps/web/lib/chargen/narrative.ts` - API client functions
- [x] `apps/web/lib/chargen/useNarrative.ts` - React hook with loading/error states

**Hook interface:**
```typescript
interface UseNarrativeOptions {
  verbosity: 'minimal' | 'structured' | 'rich';
}

interface NarrativeResult {
  description: string;
  suggestedEntities: SuggestedEntity[];
}

function useEventNarrative(
  event: CareerEvent,
  context: CharacterContext,
  options: UseNarrativeOptions
): {
  generate: () => Promise<NarrativeResult>;
  result: NarrativeResult | null;
  isLoading: boolean;
  error: Error | null;
};

function useNPCDetails(
  npcType: string,
  context: NPCContext,
  options: UseNarrativeOptions
): {
  generate: () => Promise<NPCDetails>;
  result: NPCDetails | null;
  isLoading: boolean;
  error: Error | null;
};
```

**Acceptance criteria:**
- [x] `useEventNarrative` hook working with loading states
- [x] `useNPCDetails` hook working with loading states
- [x] Errors displayed to user appropriately
- [x] Results cached to prevent duplicate API calls

---

### Task 3: Verbosity Control UI
**Effort**: Low (1 hour)

Add verbosity selector to the chargen interface.

**Files to modify:**
- [x] `apps/web/components/chargen/ChargenWizard.tsx` - Add verbosity state
- [x] `apps/web/components/chargen/VerbositySelector.tsx` - New component

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI Assistance Level                                         │
│  ┌─────────┐ ┌─────────────┐ ┌──────────┐                   │
│  │ Minimal │ │ Structured  │ │   Rich   │ ← Selected        │
│  │         │ │ (names +    │ │ (full    │                   │
│  │ (names  │ │ 1-liners)   │ │ prose)   │                   │
│  │ only)   │ │             │ │          │                   │
│  └─────────┘ └─────────────┘ └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [x] Verbosity selector visible in chargen wizard
- [x] Selection persists across steps
- [x] Verbosity passed to narrative hooks

---

### Task 4: Event Description Integration
**Effort**: Medium (2-3 hours)

Integrate AI event descriptions into the term resolution step.

**Files to modify:**
- [x] `apps/web/components/chargen/steps/TermResolutionStep.tsx`

**UI Enhancement:**
```
┌─ EVENT ────────────────────────────────────────────┐
│  Roll: 2d6 = 7                                     │
│                                                    │
│  "You make a rival in the officer corps"           │
│                                                    │
│  ┌────────────────────────────────────────────────┐│
│  │ [Generate Description]  ← AI button            ││
│  │                                                ││
│  │ During a tense fleet exercise near the         ││
│  │ Spinward Marches, your quick thinking saved    ││
│  │ the ship but showed up a senior officer...     ││
│  │                                                ││
│  │ [Regenerate] [Edit] [Accept]                   ││
│  └────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

**Behavior:**
1. Event rolls as before (auto-roll)
2. "Generate Description" button appears
3. Clicking generates AI prose at selected verbosity
4. User can accept, edit, or regenerate
5. Accepted description stored in term result

**Acceptance criteria:**
- [x] "Generate Description" button visible after event roll
- [x] AI generates description based on event and context
- [x] User can edit generated text
- [x] Description saved to CRDT state
- [x] Works without AI (button disabled if no API key)

---

### Task 5: NPC Generation Integration
**Effort**: Medium (2-3 hours)

Enhance EntitySpawnForm with AI-generated NPC details.

**Files to modify:**
- [x] `apps/web/components/chargen/EntitySpawnForm.tsx`

**UI Enhancement:**
```
┌─────────────────────────────────────────────────────────────┐
│  NEW ENTITY: Rival (NPC)                                     │
│                                                             │
│  Name: [Lt. Cmdr Vasquez_____] [AI Suggest]                 │
│                                                             │
│  Motivation:                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Generate] ← Fills based on event context               ││
│  │                                                         ││
│  │ Vasquez was passed over for promotion when Zara's       ││
│  │ family connections secured her a better posting...      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Personality: [Generate]                                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Cold and calculating. Speaks in clipped sentences.      ││
│  │ Never forgets a slight. Maintains perfect uniform.      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Appearance: [Generate]                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ (Optional - generated on request)                       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Generate All] [Skip Details] [Add to Graph →]             │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
1. Name field has "AI Suggest" button for name generation
2. Each field (motivation, personality, appearance) has individual generate buttons
3. "Generate All" fills all empty fields at once
4. User can edit any generated text
5. "Skip Details" allows minimal creation (name only)

**Acceptance criteria:**
- [x] Individual field generation buttons working
- [x] "Generate All" fills all fields appropriately
- [x] Generated content respects verbosity setting
- [x] User can edit any field before submitting
- [x] Entity created with AI-generated metadata

---

### Task 6: Connection Suggestion Engine
**Effort**: Medium (2-3 hours)

Suggest connections between spawned entities.

**Files to create:**
- [x] `apps/rag-service/services/connection_suggester.py`
- [x] `apps/web/components/chargen/ConnectionSuggestions.tsx`

**API Endpoint:**
```python
# POST /api/narrative/suggest-connections
# Suggests how entities might be connected

# Request:
{
  "entities": [
    {"id": "npc1", "name": "Vasquez", "type": "rival", "career": "navy"},
    {"id": "npc2", "name": "Admiral Chen", "type": "ally", "career": "navy"},
    {"id": "loc1", "name": "Starport Sigma", "type": "location"}
  ],
  "character": {
    "name": "Zara",
    "career_history": ["navy"]
  }
}

# Response:
{
  "suggestions": [
    {
      "source": "npc1",
      "target": "npc2", 
      "relationship": "subordinate_of",
      "description": "Vasquez serves under Admiral Chen, creating tension..."
    },
    {
      "source": "npc1",
      "target": "loc1",
      "relationship": "stationed_at",
      "description": "Vasquez is currently stationed at Starport Sigma..."
    }
  ]
}
```

**UI Component:**
```
┌─ SUGGESTED CONNECTIONS ────────────────────────────┐
│                                                    │
│  Based on your character's history:                │
│                                                    │
│  ○ Vasquez → Admiral Chen                          │
│    "Vasquez serves under Chen, who favors Zara"    │
│    [Add Connection] [Dismiss]                      │
│                                                    │
│  ○ Vasquez → Starport Sigma                        │
│    "Currently stationed there, watching Zara"      │
│    [Add Connection] [Dismiss]                      │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- [x] Connection suggestions generated from spawned entities
- [x] User can accept or dismiss suggestions
- [x] Accepted connections create graph edges
- [x] Suggestions update as new entities are spawned

---

## Agentic Browser Testing

### Critical Path Testing

After implementation, execute the following browser-based verification:

#### Test 1: Event Description Generation
```
1. Navigate to http://localhost:3010/chargen
2. Complete background step (roll characteristics, pick 3 skills, enter name)
3. Select a career and qualify
4. In term resolution, after event rolls:
   - Click "Generate Description" button
   - Verify loading state appears
   - Verify generated text appears
   - Click "Regenerate" and verify new text
   - Edit the text manually
   - Click "Accept"
5. Verify description saved (check preview panel)
```

#### Test 2: NPC Detail Generation
```
1. Continue from Test 1 or start fresh chargen
2. When an event spawns an NPC (rival/ally/contact):
   - Verify EntitySpawnForm appears
   - Click "AI Suggest" for name field
   - Verify name is generated
   - Click "Generate" for motivation
   - Click "Generate All" for remaining fields
   - Edit one field manually
   - Click "Add to Graph"
3. Verify NPC node appears in graph with generated metadata
```

#### Test 3: Verbosity Levels
```
1. Start new chargen session
2. Set verbosity to "Minimal"
   - Generate event description
   - Verify output is short (1-2 sentences)
3. Set verbosity to "Structured"
   - Generate event description
   - Verify output includes key details
4. Set verbosity to "Rich"
   - Generate event description
   - Verify output is full prose (paragraph+)
```

#### Test 4: Error Handling
```
1. Temporarily disable RAG service (stop apps/rag-service)
2. Navigate to chargen and reach event step
3. Click "Generate Description"
4. Verify error message displayed (not crash)
5. Verify manual input still works
6. Restart RAG service
7. Verify generation works again
```

### Exploratory Testing Scenarios

#### Scenario A: Rapid Generation
```
1. Generate multiple events in sequence
2. Use "Generate All" for each spawned entity
3. Verify:
   - No race conditions
   - All entities have unique content
   - Performance is acceptable (<3s per generation)
```

#### Scenario B: Edit Flow
```
1. Generate content at "Rich" verbosity
2. Edit substantial portions of the text
3. Regenerate and verify edit warning appears
4. Accept new generation
5. Verify edited content is replaced
```

#### Scenario C: Context Awareness
```
1. Create character "Admiral Zara"
2. Complete 3 terms in Navy
3. Generate NPC descriptions
4. Verify generated content references:
   - Character name
   - Navy career context
   - Prior events (if applicable)
```

#### Scenario D: Mixed Usage
```
1. Use AI for some events, skip for others
2. Use "Generate All" for some NPCs, manual for others
3. Verify all data saves correctly regardless of source
4. Complete chargen and verify final character has all data
```

### Browser Testing Evidence Collection

For each test, capture:
1. **Screenshot before action** - Initial state
2. **Screenshot during action** - Loading state or modal
3. **Screenshot after action** - Result state
4. **Console log check** - No errors in browser console

Save evidence to: `.sisyphus/evidence/phase3-ai-narrative/`

---

## Verification Checklist

After implementation, verify:

- [x] RAG service has narrative endpoints running
- [x] Event descriptions generate at all verbosity levels
- [x] NPC details generate with proper context
- [x] Connection suggestions generate for multiple entities
- [x] All generated content saves to CRDT state
- [x] Error states handled gracefully (API down, rate limits)
- [x] Manual fallback works when AI unavailable
- [x] `pnpm --filter web typecheck` passes
- [x] `pnpm --filter web build` passes
- [x] Browser tests pass with evidence captured

### Browser Test Evidence (2026-02-01)
- VerbositySelector UI visible and buttons toggle correctly
- Generate Description button appears in event phase
- Error message displayed gracefully when GEMINI_API_KEY missing
- NPC spawn form shows with AI buttons (✨ AI, Motivation, Personality, Generate NPC Details)
- Add to Campaign Graph button enables when name is filled
- Manual entry works without AI generation

### AI Generation Verified (2026-02-01)
- **API Key loaded**: Fixed `load_dotenv()` call in `main.py`
- **Model updated**: Changed from deprecated `gemini-pro` to `models/gemini-2.0-flash`
- **Event Description**: Tested via curl AND browser - returns rich prose with suggested entities
- **NPC Details**: Tested via curl - returns name, personality, motivation, appearance, quirks
- **Connection Suggestions**: Tested via curl - returns relationship suggestions between entities
- **End-to-end Browser Test**: Created character "Zara Vance", went through career flow, clicked "Generate Description" button, received AI-generated narrative, clicked "Accept & Save"

---

## Testing Strategy

### Unit Tests
- [x] Narrative API response parsing
- [x] Verbosity level output length validation
- [x] Error handling in narrative hooks

### Integration Tests
- [x] Frontend → RAG service → AI model flow
- [x] Generated content storage in CRDT
- [x] Connection suggestion accuracy

### E2E Tests (via Browser Automation)
- [x] Complete chargen with AI assistance
- [x] Verbosity switching mid-session
- [x] Error recovery scenarios

---

## Dependencies

- **Phase A2 Complete**: Chargen flow exists to integrate with
- **apps/rag-service**: Running and accessible
- **AI API Keys**: GEMINI_API_KEY or OPENAI_API_KEY configured
- **@planeshift/mgt2e**: Career/event data for context

---

## Blocks

Completing this phase:
- Enhances Phase A4 (Multiplayer) with richer shared content
- Enables future "AI GM" features
- Provides foundation for AI-powered world-building tools
