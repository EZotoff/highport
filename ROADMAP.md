# Highport Roadmap

**This is a living document. Priorities may shift based on community feedback.**

Highport is organized around a [three-tier vision](./CONCEPT.md): Character Creation (Tier A), Campaign Management (Tier B), and World Simulation (Tier C). This roadmap reflects what has shipped, what is in progress, and what is planned at each tier. Tiers build on each other; Tier A's accepted characters become the canon that Tier B remembers, and Tier B's architecture leaves room for Tier C's living sector.

---

## Tier A — Character Creation (Immediate Target)

Turn procedural Traveller chargen into a collaborative, replayable backstory engine. The dice own the facts; the AI owns the texture.

### Shipped

- **MGT2E lifepath mechanics** — survival, events, mishaps, advancement, mustering out, aging, connections `[Shipped]` `[Hard]`
- **Multiplayer session sync** — real-time collaborative chargen via Yjs CRDT `[Shipped]` `[Hard]`
- **Three AI invasiveness modes** — Brief, Inspiration, and Full generation per event, connection, and skill origin `[Shipped]` `[Hard]`
- **Portrait generation** — Gemini-backed character portraits with remix `[Shipped]` `[Medium]`
- **Drifter starter career** — core skills and a single career so you can explore immediately `[Shipped]` `[Easy]`
- **Full MGT2E career data** — all 12 Core Rulebook careers ship in-repo (Agent, Army, Citizen, Drifter, Entertainer, Marine, Merchant, Navy, Noble, Rogue, Scholar, Scout) `[Shipped]` `[Medium]`
- **Skeleton/meat provenance contract formalization** — traceable `source`, `mode`, `status`, and `derivedFrom` on every generated fragment; immutability guarantees for dice output `[Shipped]` `[Hard]`
- **UI polish** — spacing, typography, dark-mode contrast, and responsive refinements across the chargen wizard `[Shipped]` `[Easy]`
- **"Submit to Draft" conscription mechanic** — optional re-enlistment tension with visual and narrative weight `[Shipped]` `[Medium]`
- **Gamified Tyranny-style chapter summaries** — each completed term renders as a chapter card (term number, career, key event, skills, rank, mishap, aging); finalize produces a stitched Service Record scrapbook `[Shipped]` `[Hard]`
- **Per-career event flavor templates** — career-specific scene framing so a Navy event reads differently than a Rogue event; 3+ original paraphrased templates per career `[Shipped]` `[Medium]`

> **Ground truth:** Mechanics are 100% complete. Game data (all 12 Core Rulebook careers) is 100% in-repo. Gamification (chapter summaries + Service Record) has shipped. Per-career event flavor has shipped. **The AI enrichment layer is partially wired** — manual generation works end-to-end, but auto-triggering on event rolls, session-level verbosity sync, mishap enrichment, and RAG-backed setting-aware generation remain open. See `docs/analysis/chargen-ai-assistance-analysis.html` for the full gap analysis.

---

## Tier B — Campaign Management (Next)

Carry accepted characters and lore into a gated, voice-aware campaign memory. The ship speaks; the GM prepares.

### Shipped

- **RAG service** — multi-provider LLM factory with local-first defaults (Ollama + ChromaDB); cloud providers (Gemini, OpenAI, Pinecone) are opt-in `[Shipped]` `[Hard]`
- **Knowledge scopes** — `public`, `party`, `gm`, and `char:<id>` partitions for campaign memory (header-trust enforcement; server-side authenticated resolver planned) `[Shipped]` `[Hard]`
- **SSE streaming query** — real-time token streaming for "Ask Computer" responses `[Shipped]` `[Medium]`
- **PDF and text ingest API** — upload sourcebooks and session notes into the campaign knowledge base via the `/ingest` endpoint `[Shipped — API only]` `[Medium]` (GM-facing UX wrapper is the Step 0 worldbuilding flow, planned)
- **Narrative generation endpoints** — event summaries, NPC drafts, and connection suggestions `[Shipped — prompt-only]` `[Hard]` (retrieval-augmented wiring pending — these endpoints currently call `llm.generate(prompt)` without querying the campaign vector store; see Known Issue #5)
- **Portrait remix** — regenerate or vary existing portraits while inheriting entity visibility `[Shipped]` `[Easy]`
- **Graph editor for campaign entities** — React Flow visual editor for NPCs, locations, factions, and relationships `[Shipped]` `[Hard]`
- **Yjs collaborative state** — real-time multi-user editing across the campaign graph and documents `[Shipped]` `[Hard]`

### In Progress

- **Pirates of Drinax starter lore pack** — pre-ingested campaign background, NPCs, and locations for the classic MGT2E adventure `[In Progress]` `[Medium]`
- **Graph editor maturation** — edge routing, node grouping, relationship types, and layout persistence `[In Progress]` `[Medium]`
- **Campaign CRUD polish** — rename, description updates, archive, and deletion flows `[In Progress]` `[Easy]`
- **Step 0 worldbuilding UX** — GM-facing campaign setup that wraps the ingest endpoint: upload sourcebooks, review extracted entities (factions, locations, NPCs), prime the RAG store before players join. Prerequisite for setting-aware chargen enrichment `[Planned]` `[Hard]`

### Planned

- **Ship's AI persona (player-facing)** — diegetic "The Steward" that answers from public and party scopes the player is permitted to see `[Planned]` `[Hard]`
- **GM Assistant persona (omniscient prep)** — non-diegetic co-GM that sees GM-only records, proposes secrets, and summarizes factions `[Planned]` `[Hard]`
- **Server-side authenticated scope resolver** — replace the current header-trust model with an auth-checked resolver before serious multi-user deployment `[Planned]` `[Hard]`
- **Persona, voice, and music asset generation** — structured profiles (voice, demeanor, secrets, speech patterns); voice generation is explicitly experimental `[Planned]` `[Hard]`
- **Foundry VTT bidirectional sync** — actor sync for accepted MGT2E characters, NPC/relationship push, and social-scene context piped to the AI; see [`packages/foundry-module/`](./packages/foundry-module/) `[Planned]` `[Experimental]` `[Hard]`
- **Per-character knowledge gating** — `char:<id>` secrets scoped to individual players, not just the party as a whole `[Planned]` `[Medium]`
- **Trap-document security tests** — automated tests that verify scope leakage cannot occur across public, party, gm, and char boundaries `[Planned]` `[Medium]`

> **Ground truth:** The Ship's AI persona, GM Assistant, and voice generation are not yet in code. Foundry integration is experimental. Knowledge gating currently trusts a client header; this is a known issue flagged below.

---

## Tier C — World Simulation (Long-term)

The sector breathes while you sleep in jump space.

### Research

- **Faction turn engine** — deterministic turn structure for faction moves between sessions `[Research]` `[Hard]`
- **Resource ledger** — credits, ships, troops, trade goods, influence, intel, and logistics tracking per faction `[Research]` `[Hard]`
- **Goal hierarchy** — strategic goals decomposed into objectives, operations, and tasks, updated dynamically `[Research]` `[Hard]`
- **Decision engine** — rule-first proposal generation, stochastic variation, and LLM narrative explanation of faction choices `[Research]` `[Hard]`
- **Immutable event log** — every faction move recorded for GM audit and rewind `[Research]` `[Medium]`
- **GM review queue** — major faction moves surface for approval, editing, or rejection before becoming canon `[Research]` `[Medium]`

> Not yet implemented. Architecture in Tiers A and B is designed to leave room for it.

---

## Known Issues & Hard Problems

This project is honest about its debt. The following issues are tracked and will be addressed in priority order:

1. **Committed `.env` with live API keys** — A `.env` file containing real API keys was committed to the repository. This is a security issue. Keys must be rotated and the file removed from history. New contributors should always copy `.env.example` and generate their own secrets.
2. **Header-based knowledge gating trust model** — The RAG service currently trusts a client-supplied header to determine knowledge scope. This is acceptable for local development but must be replaced with a server-side authenticated scope resolver before any serious multi-user deployment.
3. **~~Stale duplicate provider files in `rag-service`~~** — **Resolved.** The duplicate `providers/gemini.py` and `providers/base.py` top-level files have been removed. Both `narrative_generator.py` and `portrait_generator.py` now correctly import from the factory package (`providers.llm`). Kept here for historical reference.
4. **`docs/rag-setup.md` documentation bugs** — The JSON ingest example and the `/scope` endpoint name contain errors that do not match the running API. These will be corrected in a docs pass.
5. **Chargen enrichment is prompt-only** — The `/narrative/*` endpoints call `llm.generate(prompt)` directly and do not retrieve from the campaign vector store, even when the GM has uploaded setting material. The `generate_with_context` method exists on every LLM provider but is only called by `/query` (Ask Computer). Switching the narrative endpoints to retrieve before generating is required for the "meat is grounded in the GM's world" contract from CONCEPT.md. See `docs/analysis/chargen-ai-assistance-analysis.html` §07.
6. **Session-level `aiVerbosity` is never read** — The setting is defined in `SessionSettings`, has a default (`'inspiration'`), and can be set via `useGMControls`, but the live UI uses local React state in `ChargenWizard` instead. No GM control exists to change it. See gap analysis §03.
7. **Multiple session flags writable but unenforced** — `requireGMApproval`, `allowCrossPlayerConnections`, and `allowedCareers` can be toggled in the GM panel but are never consulted by any code path. The flags are stored, persisted, and ignored. See gap analysis §03.
8. **Auto-trigger missing for event enrichment** — `handleEventRoll()` in `TermResolutionStep.tsx` stores the event and transitions phase without calling `generateNarrative()`. The only working auto-enrichment is `ConnectionSuggestions.tsx`. The proven `useEffect` pattern needs to be mirrored in `TermResolutionStep`. See gap analysis §04.

---

## Community Input

**We would love to hear what features matter most to you.**

### How to Request Features

Open a GitHub Issue with the `feature-request` label and include:

- What problem you are trying to solve
- How you currently handle this workflow
- Any reference implementations you have seen elsewhere

### How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and contribution guidelines.

### Difficulty Labels Explained

| Label      | Meaning                                                        | Good For                                     |
| ---------- | -------------------------------------------------------------- | -------------------------------------------- |
| `[Easy]`   | Small scope, minimal dependencies, well-defined                | First-time contributors                      |
| `[Medium]` | Requires some domain knowledge or touches multiple components  | Contributors familiar with the stack         |
| `[Hard]`   | Architectural changes, new subsystems, significant design work | Core maintainers or experienced contributors |

---

_For technical details about architecture, see the per-app `README.md` files under `apps/` and `packages/`._
