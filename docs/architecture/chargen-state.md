# Chargen State Architecture

## Overview

This document describes chargen state management, the Yjs CRDT structures that carry shared data, and the lifecycle of AI-authored content. It also explains GM approval gates, cross-character link acceptance, and provenance transfer when chargen creates graph entities.

## Authoritative State

The shared `Y.Doc` is the single source of truth. React hooks keep local render snapshots, but shared proposals and approvals are always read from and written to Yjs. See [state.ts](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/state.ts) and [hooks.ts](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/hooks.ts).

- `characters`: `Y.Map<Y.Map<unknown>>`, keyed by character ID. Each child map holds a `ChargenCharacter`, including its `CareerTermResult[]`.
- `crossCharacterLinks`: `Y.Map<Y.Map<unknown>>`, keyed by proposal ID.
- `lifepathProposals`: `Y.Map<Y.Map<unknown>>`, keyed by proposal ID. `characterId` scopes a proposal; older entries without it remain visible to all characters.
- `entityPool`: `Y.Map<Y.Map<unknown>>`, keyed by spawned entity ID.
- `connectionRequests`: `Y.Array<unknown>`, retained as an ordered request queue.
  ID-keyed `Y.Map` collections let concurrent clients update separate proposals or fields without replacing an array element. `Y.Array` is appropriate when order is part of the data, but delete-and-insert updates can conflict when it is used as an entity store.

```typescript
export function getLifepathProposalsMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  const chargen = getChargenMap(doc);
  if (!chargen.has('lifepathProposals')) {
    chargen.set('lifepathProposals', new Y.Map());
  }
  return chargen.get('lifepathProposals') as Y.Map<Y.Map<unknown>>;
}
```

`useAllCharacters`, `useLifepathProposals`, and `useCrossCharacterLinks` call `observeDeep`, rebuild plain objects from map values, and unsubscribe on cleanup. These arrays are projections for rendering, not competing stores.

## AI Provenance Lifecycle

The exact wrapper in [types.ts](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/types.ts) keeps `value` and provenance fields in one object. Conceptually the metadata is the value's provenance, but it is not nested under a `provenance` property.

```typescript
export interface AIProvenance<T> {
  value: T;
  source: 'ai' | 'dice' | 'player' | 'gm';
  mode: VerbosityLevel;
  status: 'draft' | 'accepted' | 'rejected' | 'edited';
  derivedFrom?: string;
  generatedAt?: number;
  proposedBy?: string;
  pendingReviewBy?: 'gm' | 'player' | null;
  reviewLog?: Array<{ at: number; by: string; from: string; to: string; edit?: string }>;
}
```

The lifecycle is: AI generates a value, the caller stamps provenance, the wrapped value is persisted in the character's Yjs data, the UI applies the GM gate, then `resolveAIDraft` records the resolution. Status moves from `draft` to `accepted`, `rejected`, or `edited`. A GM edit also changes `source` to `gm`, appends `reviewLog`, and clears `pendingReviewBy`.

```typescript
const targetStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'edited';
const updatedField: AIProvenance<string> = {
  ...currentField,
  status: targetStatus as AIProvenance<string>['status'],
  pendingReviewBy: null,
  reviewLog: [...(currentField.reviewLog || []), reviewEntry],
};
```

When `pendingReviewBy` is `'gm'`, player visibility depends on the approval mode. The value remains in authoritative state even when the UI hides it.

## GM Approval Modes

`SessionSettings` selects both approval and link-generation policy:

```typescript
export interface SessionSettings {
  allowedCareers: string[];
  aiVerbosity: 'brief' | 'inspiration' | 'full';
  isLocked: boolean;
  gmApprovalMode: 'moderate' | 'strict' | 'lenient';
  crossCharacterLinkMode: 'gm-mediated' | 'player-to-player';
}
```

- `strict`: a player sees a placeholder while `pendingReviewBy === 'gm'`; a GM can see the draft.
- `moderate`: the draft is visible with a pending-review badge.
- `lenient`: generated content is immediately visible and treated as accepted.
  [shouldShowDraft](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/gm-approval.ts) is the visibility gate. Its actual signature is `shouldShowDraft(mode, provenance, isGM)`. `isCanonical` decides whether content is authoritative, while `requiresReview` controls actions that must wait for approval. Player edits keep `pendingReviewBy: 'gm'` in strict and moderate modes; lenient mode clears it.

## Cross-Character Links

The shared proposal types are:

```typescript
export interface LifepathProposal {
  id: string;
  characterId?: string;
  type: 'coherence-edit' | 'npc-connection' | 'plot-hook';
  targetTerm: number;
  title: string;
  description: string;
  proposedEdit?: string;
  status: 'pending' | 'accepted' | 'rejected';
  generatedAt: number;
}

export interface CrossCharacterLinkProposal {
  id: string;
  sourceCharId: string;
  targetCharId: string;
  sourceEntityId?: string;
  targetEntityId?: string;
  relationship: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  generatedAt: number;
  acceptedBy?: string[];
}
```

In `player-to-player` mode, finalizing two or more characters triggers proposal generation. In `gm-mediated` mode, the GM starts generation manually. Generated proposals are persisted immediately, never held only in component state.
Both linked characters must accept before a proposal becomes active. Storage uses a nested `Y.Map` keyed by character ID, although the public type exposes `acceptedBy` as `string[]`. Independent offline acceptances therefore merge instead of overwriting each other.

```typescript
doc.transact(() => {
  acceptedBy.set(characterId, true);
  linkMap.set('status', bothAccepted ? 'accepted' : 'pending');
  if (bothAccepted) createCrossCharacterLinkEdge(doc, link);
}, 'cross-character-link-accept');
```

## Entity Spawning

`spawnEntity` accepts optional provenance metadata derived from `AIProvenance` and writes it to both the graph node and returned `SpawnedEntityRef`. This preserves authorship and review status as data moves from a chargen draft into the campaign graph. See [entity-spawner.ts](file:///home/ezotoff/AI_projects/traveller/apps/web/lib/chargen/entity-spawner.ts).
The NPC Add button is disabled when `pendingReviewBy === 'gm'` in strict mode. The shared `requiresReview` gate applies the same block in moderate mode, and allows submission after GM resolution or in lenient mode.

## Key Invariants

- Never write shared proposals to local state as their authority. Persist them to Yjs, then derive UI state through hooks.
- Never strip provenance while moving AI-authored data between chargen, approval, spawning, and graph layers.
- Always wrap multi-operation changes in `doc.transact()`.
- Attach a `Y.Map` to the `Y.Doc` or an attached parent before reading from or writing to it.
