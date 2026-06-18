# Highport Foundry Module

> The airlock to your virtual tabletop.

An optional Foundry VTT module for bidirectional sync between Highport campaigns and Foundry VTT worlds. It is plain JavaScript with no build step.

## Subsystem Status

Experimental. Module structure exists but is not yet integrated with the main Highport sync engine. Not packaged for the Foundry module registry.

## Quick Links

- [Root README](../../README.md) - main project overview
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - dev setup and PR process

## Installation

When stable, copy or symlink this directory into your Foundry VTT installation at `Data/modules/highport-bridge/`. Requires Foundry VTT v11+.

## Architecture Notes

- `module.json` is the Foundry manifest.
- `module.js` is the entry point.
- `scripts/` will contain sync handlers using the same Hocuspocus WebSocket protocol as the web client.
- `lang/en.json` holds i18n strings.

## License

MIT - see [root LICENSE](../../LICENSE).
