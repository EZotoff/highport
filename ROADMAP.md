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

### In Progress

- **Full MGT2E career data via external pack** — load all careers, tables, and benefits from a user-provided game data pack `[In Progress]` `[Medium]`
- **Skeleton/meat provenance contract formalization** — traceable `source`, `mode`, `status`, and `derivedFrom` on every generated fragment; immutability guarantees for dice output `[In Progress]` `[Hard]`
- **UI polish** — spacing, typography, dark-mode contrast, and responsive refinements across the chargen wizard `[In Progress]` `[Easy]`

### Planned

- **Gamified Tyranny-style replayable flow** — each term feels like a chapter; accepted scenes build a scrapbook-style service record `[Planned]` `[Hard]`
- **"Submit to Draft" conscription mechanic** — optional re-enlistment tension with visual and narrative weight `[Planned]` `[Medium]`
- **Per-career event flavor** — career-specific scene templates so a Navy event reads differently than a Rogue event `[Planned]` `[Medium]`

> **Ground truth:** Mechanics are roughly 95% complete. Game data (careers, tables, equipment) is roughly 10% — only the Drifter career ships in-repo. Gamification is aspirational and not yet in code.

---

## Tier B — Campaign Management (Next)

Carry accepted characters and lore into a gated, voice-aware campaign memory. The ship speaks; the GM prepares.

### Shipped

- **RAG service** — multi-provider LLM factory with local-first defaults (Ollama + ChromaDB); cloud providers (Gemini, OpenAI, Pinecone) are opt-in `[Shipped]` `[Hard]`
- **Knowledge scopes** — `public`, `party`, `gm`, and `char:<id>` partitions for campaign memory (header-trust enforcement; server-side authenticated resolver planned) `[Shipped]` `[Hard]`
- **SSE streaming query** — real-time token streaming for "Ask Computer" responses `[Shipped]` `[Medium]`
- **PDF and text ingest** — upload sourcebooks and session notes into the campaign knowledge base `[Shipped]` `[Medium]`
- **Narrative generation endpoints** — event summaries, NPC drafts, and connection suggestions via the RAG service `[Shipped]` `[Hard]`
- **Portrait remix** — regenerate or vary existing portraits while inheriting entity visibility `[Shipped]` `[Easy]`
- **Graph editor for campaign entities** — React Flow visual editor for NPCs, locations, factions, and relationships `[Shipped]` `[Hard]`
- **Yjs collaborative state** — real-time multi-user editing across the campaign graph and documents `[Shipped]` `[Hard]`

### In Progress

- **Pirates of Drinax starter lore pack** — pre-ingested campaign background, NPCs, and locations for the classic MGT2E adventure `[In Progress]` `[Medium]`
- **Graph editor maturation** — edge routing, node grouping, relationship types, and layout persistence `[In Progress]` `[Medium]`
- **Campaign CRUD polish** — rename, description updates, archive, and deletion flows `[In Progress]` `[Easy]`

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
3. **Stale duplicate provider files in `rag-service`** — `providers/gemini.py` and `providers/base.py` exist at the top level of the RAG service and bypass the LLM factory. These duplicates should be removed or consolidated so all provider access routes through the factory.
4. **`docs/rag-setup.md` documentation bugs** — The JSON ingest example and the `/scope` endpoint name contain errors that do not match the running API. These will be corrected in a docs pass.

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
