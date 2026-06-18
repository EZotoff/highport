# Highport Roadmap

**This is a living document. Priorities may shift based on community feedback.**

Highport is the bridge of your campaign. Use it to manage NPCs, factions, locations, and knowledge between game sessions and during play. This roadmap outlines where we've been and where we're heading.

---

## Now (v0.1 — Launch)

What shipped in the initial release:

- **Email/password authentication** (NextAuth.js) `[Shipped]`
- **Campaign management** (create, list, view, delete) `[Shipped]`
- **Real-time collaborative graph editor** (React Flow + Yjs CRDT) `[Shipped]`
- **AI-powered campaign research** (RAG with knowledge gating) `[Shipped]`
- **Free-tier AI setup** (Ollama + ChromaDB, no API keys needed) `[Shipped]`
- **Offline-first with IndexedDB persistence** `[Shipped]`
- **Reputation/faction tracking tables** `[Shipped]`
- **Character generation wizard** (Traveller chargen) `[Shipped]`

---

## Next (v0.2 — Near-term)

What we are actively working toward:

- **Campaign sharing and invite links** `[Medium]`
- **Character sheet management and NPC stat blocks** `[Hard]`
- **Password reset flow** `[Easy]`
- **Foundry VTT bidirectional sync** `[Hard]` _experimental, in active development in [`packages/foundry-module/`](./packages/foundry-module/)_
- **Portrait management improvements** `[Medium]`
- **Campaign edit** (rename, description update) `[Easy]`

---

## Later (v0.3+ — Medium-term)

Features we want but require significant design or dependency work:

- **Multi-provider auth** (GitHub, Google OAuth) `[Medium]`
- **Campaign templates and starter content** `[Medium]`
- **Advanced permissions** (GM/player roles with fine-grained access) `[Hard]`
- **Mobile-responsive UI** `[Hard]`
- **Campaign search, filtering, and pagination** `[Easy]`
- **Sector map visualization** `[Hard]`
- **Campaign timeline/event tracker** `[Medium]`

---

## Vision (v1.0 — Long-term)

Big ideas that shape the direction of the project:

- **Plugin system for custom game systems** (not just Traveller) `[Hard]`
- **Community game data packages** `[Medium]`
- **Self-hosted deployment guides** (Docker production config) `[Medium]`
- **Campaign import/export** (JSON/ZIP) `[Medium]`
- **World generation tools** (procedural star systems) `[Hard]`
- **Multi-language support** (i18n) `[Hard]`

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
