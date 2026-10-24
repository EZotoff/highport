# Momus verdicts: fix-crdt-crosschar.md

## Round 1 (bg_808f8268) — [REJECT]

Blocking: (1) CRITICAL Task 1 edge assertion unachievable with Task 2 — no post-merge reconciliation path; (2) MAJOR acceptedBy.has() early return blocks repair; (3) MAJOR Task 7 false premise (state module fully mocked, importActual claim false). Non-blocking: chargen-state.test.ts path, TermResolutionStep path, Yjs semantics load-bearing.

## Round 2 (bg_808f8268, delta) — [REJECT]

Round-1 blockers #1/#2 fixed; path corrections confirmed. New defects:

1. MAJOR — reconcile wiring contradictory + recursive (design line 59 vs Task 2 (2)/(5)): line 59 invoked FROM getCrossCharacterLinks, Task 2(2) iterates it, Task 2(5) hooks wiring — recursion if both implemented.
2. MAJOR — Task 7 vi.importActual replacement breaks existing addCrossCharacterLink spy assertion (useNarrative.test.ts:268-295); fallback adds no Yjs-write coverage.
   Non-blocking: RED-test dynamic import; Task 3 legacy random-id edges survive reject; Task 4 wording ambiguity; Yjs semantics load-bearing (~13.6.29 pin).

## Round 3 (bg_808f8268, delta) — [OKAY] APPROVED

All round-1 and round-2 blockers resolved: single production wiring point (hooks updateLinks), getCrossCharacterLinks kept pure (no recursion), Task 7 moved to new file useNarrative-yjs-write.test.ts (original untouched), RED-safety dynamic import.

Non-blocking notes (opportunistic):

- Line 59 "ONLY other invocation" contradicts Task 2(3) accept-path reconcile call — reword to "accept repair path".
- Task 4 "keep scan + also create deterministic id" ambiguous — pick one variant, confirm concurrent collapse.
- Task 3 deletes only deterministic-id edges; legacy random-id edges survive GM reject — worth an in-code comment.
- Task 5 single-update assertion depends on lazy map creation inside the outer transact — verify in implementation.

Remaining risks: Yjs nested-transact/\_prelimContent semantics load-bearing (mitigated by source inspection + ~13.6.29 pin); Task 4 two-doc finalize test mock-switching underspecified but discoverable.

```yaml
review_ledger:
  plan: .omo/plans/fix-crdt-crosschar.md
  round: 3
  budget: '4+2: round 3/4 standard'
  verdict: OKAY
  findings: [3 MINOR non-blocking notes]
  disposition: 'Approved for execution; minor notes may be addressed opportunistically.'
```
