# FOUNDRY MODULE KNOWLEDGE BASE

> Generated: Tue Jan 27 2026
> Scope: packages/foundry-module

## OVERVIEW

The Highport Foundry VTT module acts as a bridge between the campaign management platform and the virtual tabletop. It enables bidirectional synchronization of character data (Actors) between Highport and Foundry VTT, specifically designed for the **Mongoose Traveller 2e (mgt2e)** system.

## STRUCTURE

The module follows standard Foundry VTT package structure:

- `module.js` - Module entry point and initialization hooks
- `module.json` - Manifest defining metadata, dependencies, and scripts
- `scripts/sync.js` - Logic for detecting local changes and sending to server
- `scripts/receive.js` - Logic for receiving server updates and applying to actors
- `scripts/socket.js` - WebSocket client for communicating with Highport server
- `scripts/settings.js` - Module configuration (Server URL, API Key)

## KEY MODULES

| File | Role | Key Functions |
|------|------|---------------|
| `socket.js` | Comms Layer | `FoundryBridge`, `connect()`, `handleMessage()` |
| `sync.js` | Outbound Sync | `buildSyncPayload`, `Hooks.on("updateActor")` |
| `receive.js` | Inbound Sync | `handleNodeUpdate`, `mapToFoundryPaths` |
| `module.js` | Lifecycle | `Hooks.once("init")`, `Hooks.once("ready")` |

## FOUNDRY VERIFICATION PROTOCOL

**IMPORTANT: Automated testing is NOT possible for Foundry modules.**
Manual testing in Foundry VTT is REQUIRED.

### Level 1: Static Gates
- JavaScript syntax check (ESLint if configured)
- module.json valid JSON

### Level 2: Manual Testing Checklist
Must be performed in Foundry VTT with module enabled:

- [ ] Module loads without console errors
- [ ] Settings page renders correctly
- [ ] WebSocket connects to Highport server
- [ ] Actor sync: Highport → Foundry works
- [ ] Actor sync: Foundry → Highport works
- [ ] Conflict resolution works correctly (no echo loops)
- [ ] Disconnect/reconnect handling works

### Evidence Requirements
- Screenshot of Foundry console (no errors)
- Screenshot of synced actor data
- Document any discrepancies

## SYNC PATTERNS

- **Bidirectional**: Updates flow both ways (Foundry ↔ Highport).
- **Echo Prevention**: Uses `options.highport` flag in `actor.update` to prevent infinite sync loops.
- **Data Mapping**:
  - `system.hits.value` ↔ `hp.current`
  - `system.finance.cash` ↔ `credits`
  - `system.characteristics.*` ↔ `characteristics.*`

## CONVENTIONS

- **Foundry API**: Target Foundry VTT v12+.
- **System**: Strictly typed for `mgt2e` data model.
- **WebSockets**: Native `WebSocket` implementation (no Socket.io).

## ANTI-PATTERNS

- Testing code changes without running Foundry VTT.
- Ignoring `mgt2e` system specific field paths.
- Modifying `module.json` version without updating changelog.
- Committing secrets or local API keys in default settings.
