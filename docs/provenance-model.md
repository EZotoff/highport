# Highport Provenance Model

> How the dice own the facts and the AI owns the texture — and how Highport keeps the two apart.

Highport layers AI-generated creative texture onto MGT2E procedural character generation. The provenance model is the contract that makes this trustworthy: every piece of content in a character's lifecycle carries a tag that says who or what produced it, and what you, the player or GM, did about it.

---

## The Skeleton/Meat Contract

This contract is the central concept of Highport's chargen system. It was introduced in [CONCEPT.md](../CONCEPT.md) under "The skeleton/meat contract" (Tier A). The idea is simple:

| Layer    | What it is                                                                                   | Who owns it     | Mutable? | Provenance tag                     |
| -------- | -------------------------------------------------------------------------------------------- | --------------- | -------- | ---------------------------------- |
| Skeleton | Procedural, dice-driven mechanical facts                                                     | The MGT2E rules | No       | `source: "dice"` or `"mgt2e-rule"` |
| Meat     | AI-generated backstory texture, scene descriptions, NPC names, and relationship implications | The AI (draft)  | Yes      | `source: "ai"`, status: `"draft"`  |
| Meat     | AI suggestions that the player or GM has accepted, edited, or rejected                       | The player/GM   | Edits    | `source: "player"` or `"gm"`       |

A character's mechanical skeleton is immutable — you cannot rewrite a failed survival roll or a rolled event. The AI layers description and narrative onto those mechanical facts, but every AI output is a draft until someone at the table accepts, edits, or rejects it.

---

## Skeleton: MGT2E Rule Provenance

The skeleton is everything produced by the MGT2E rules engine. This data is:

- **Immutable** once rolled.
- **Deterministic** — same dice seed yields same result.
- **Stored as plain values** (not wrapped in `AIProvenance`).

### What belongs to the skeleton

| Category         | Example fields in `ChargenCharacter` / `CareerTermResult`                 | Type                                                  |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Characteristics  | `characteristics: CharacteristicSet`                                      | Six 2D6 rolls (STR, DEX, etc.)                        |
| Career path      | `careerId`, `assignmentId`, `termNumber`                                  | Chosen by player, governed by qualification roll      |
| Survival         | `survivalRoll: DiceResult`, `survived: boolean`                           | 2D6 against career survival target                    |
| Events & mishaps | `eventRoll: DiceResult`, `event: CareerEvent`, `mishap: CareerMishap`     | 2D6 against event/mishap tables                       |
| Advancement      | `advancementRoll: DiceResult`, `advanced: boolean`, `currentRank: number` | 2D6 against advancement target                        |
| Commission       | `commissionRoll: DiceResult`, `commissioned: boolean`                     | 2D6 against commission target (military careers only) |
| Aging            | `agingRoll: DiceResult`, `agingEffect: AgingEffectTier`                   | 2D6 against aging table                               |
| Skills gained    | `skillsGained: Array<{skill, specialty?, level}>`                         | From career skill tables                              |
| Mustering out    | `MusteringState` (benefits, credits, ship shares)                         | Benefit rolls                                         |

Career definitions themselves — skill tables, survival targets, rank titles, event/mishap tables — are also skeleton data. They ship in-repo under [`packages/mgt2e/src/data/srd/careers/`](../packages/mgt2e/src/data/srd/careers/) and are loaded via the `@highport/mgt2e` package. See a career like [navy.ts](../packages/mgt2e/src/data/srd/careers/navy.ts) for the concrete shape: `CareerDefinition` with `qualification`, `assignments[]`, `skillTable`, `ranks[]`, `benefits[]`.

In the type system, skeleton data is stored as bare values — no provenance wrapper. For example, `advanced: boolean` is just a boolean; `currentRank: number` is just a number.

---

## Meat: AI-Generated Texture

The meat is every creative layer the AI adds to the procedural skeleton — descriptions, NPC names, scene drafting, connection suggestions, and all narrative texture. Meat is always **draft** until someone at the table acts on it.

### The `AIProvenance<T>` wrapper

Every field that can contain AI-generated content is typed as `AIProvenance<T> | T`. The `AIProvenance<T>` wrapper, defined in [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts), tracks:

```typescript
export interface AIProvenance<T> {
  value: T; // The actual content
  source: 'ai' | 'dice' | 'player' | 'gm'; // Who/what produced it
  mode: VerbosityLevel; // 'brief' | 'inspiration' | 'full'
  status: 'draft' | 'accepted' | 'rejected' | 'edited';
  derivedFrom?: string; // What it was generated from (event roll, etc.)
  generatedAt?: number; // Timestamp
}
```

### Field lifecycle

A meat field passes through four states:

```
AI generates
    │
    ▼
 [draft] ────────────────────────────► [accepted]
    │                                       │
    │ Player/GM edits                       │ Can still be edited later
    ▼                                       ▼
 [edited] ◄─────────────────────────  [edited]
    │
    │ Player/GM rejects
    ▼
 [rejected]  ← field treated as missing by unwrapAIField()
```

- **`draft`**: The AI has proposed content. It is visible to the player but marked as provisional.
- **`accepted`**: The player or GM has confirmed this content. It becomes canonical.
- **`edited`**: The player or GM modified the AI's draft before accepting. The content is canonical but provenance records the edit.
- **`rejected`**: The player or GM explicitly dismissed this content. The field is treated as if it does not exist.

### Unwrapping for display

The helper `unwrapAIField<T>()` in [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts) handles backward-compatible unwrapping of `AIProvenance<T> | T | undefined`:

- If the field is an `AIProvenance` with `status: "rejected"`, it returns `undefined` — rejected content is hidden.
- Otherwise it returns the inner `value`.
- If the field is already a bare `T` (old persisted data), it passes through.

### What fields carry provenance

The primary user of `AIProvenance` in the chargen type system is `eventDescription` on `CareerTermResult`:

```typescript
eventDescription?: AIProvenance<string> | string;
```

As the system matures, additional narrative fields (NPC descriptions, connection backstories, benefit acquisition stories) will adopt the same wrapper pattern.

---

## The AI Invasiveness Dial

Meat generation is controlled by three invasiveness levels, set per session by the GM (see `SessionSettings.aiVerbosity` in [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts)). This is described in full in [CONCEPT.md](../CONCEPT.md) "AI invasiveness — three modes."

| Mode          | Public name | What it produces                                                                      |
| ------------- | ----------- | ------------------------------------------------------------------------------------- |
| `brief`       | Brief       | A 1-2 sentence gloss. Low draft load.                                                 |
| `inspiration` | Inspiration | Several hooks or options to pick from. Default setting.                               |
| `full`        | Full        | A coherent scene with named NPCs and relationship implications. Requires more review. |

The contract remains: no matter the mode, the skeleton is never rewritten. The AI adds texture; the dice own the facts.

---

## Player and GM Agency

The provenance model is designed around player and GM agency:

1. **Reject** any AI draft. A rejected draft is invisible to display (via `unwrapAIField`) and can be regenerated.
2. **Accept** a draft as-is. It becomes canonical meat.
3. **Edit** a draft before accepting. The `status: "edited"` + `source: "player"` tag tells the system (and other players) that a human shaped the output.
4. **GM overrides**: The GM can accept, reject, or edit any player's AI drafts via the GM control panel (though the current UI primarily surfaces this for connection requests). Session-level controls — allowed careers, approval requirements, session lock — are tracked in `SessionSettings` and administered through [GMControlPanel.tsx](../apps/web/components/chargen/GMControlPanel.tsx).

Skeleton data is permanent: once rolled, characteristics, career paths, events, and die results are immutable in the character record. No player or GM action can rewrite the dice.

---

## Implementation Reference

| Concept                | Source file                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `AIProvenance<T>` type | [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts)                                   |
| `unwrapAIField()`      | [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts)                                   |
| Career skeletons       | [`packages/mgt2e/src/data/srd/careers/`](../packages/mgt2e/src/data/srd/careers/)                     |
| `SessionSettings`      | [`apps/web/lib/chargen/types.ts`](../apps/web/lib/chargen/types.ts)                                   |
| GM Controls UI         | [`apps/web/components/chargen/GMControlPanel.tsx`](../apps/web/components/chargen/GMControlPanel.tsx) |
| GM Controls logic      | [`apps/web/lib/chargen/useGMControls.ts`](../apps/web/lib/chargen/useGMControls.ts)                   |
| Product vision         | [`CONCEPT.md`](../CONCEPT.md) — "The skeleton/meat contract"                                          |

---

_This document is part of Highport's internal documentation. For the product vision, see [CONCEPT.md](../CONCEPT.md). For implementation status, see [ROADMAP.md](../ROADMAP.md)._
