# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

igloo-cli is a command-line companion for the FROSTR signing stack. FROSTR is a distributed key management and remote signing protocol for nostr that uses Shamir Secret Sharing to split an nsec into multiple shares, enabling k-of-n threshold signature setups.

This CLI is built with React (via Ink), TypeScript, and uses the ESM module system.

## Development Commands

```bash
# Install dependencies
npm install

# Run CLI in development (no build required)
npm run dev [command] [flags]

# Build for distribution
npm run build

# Run built CLI
npm start   # or: node dist/cli.js

# Type checking
npm run typecheck

# Test (runs typecheck + tsx --test)
npm test

# Link binary locally for testing
npm link
igloo --help
```

Bun alternative scripts: `npm run dev:bun`, `npm run build:bun`, `npm run test:bun`

## Command Structure

**Binary names**: `igloo` and `igloo-cli` (both work after linking)

**Top-level commands**:
- `igloo` — Animated welcome screen
- `igloo setup --threshold 2 --total 3` — Bootstrap checklist for k-of-n setup
- `igloo about` — FROSTR architecture overview
- `igloo status --share <id>` — Peer diagnostics (shortcut for `share status`)
- `igloo signer --share <id>` — Run a signer (shortcut for `share signer`)
- `igloo policy --share <id>` — Policy management (shortcut for `share policy`)
- `igloo relays` — Show/set default relays

**Share namespace** (`igloo share <subcommand>`):
- `add --group <bfgroup> --share <bfshare>` — Import share
- `list` — List saved shares
- `load --share <id>` — Decrypt and display share
- `status --share <id>` — Peer diagnostics via Bifrost
- `signer --share <id>` — Long-lived signer process
- `policy --share <id>` — Configure send/receive rules

**Keyset namespace** (`igloo keyset <subcommand>`):
- `create` — Generate and persist encrypted shares

**Keys namespace** (`igloo keys <subcommand>`):
- `convert --from <type> --value <key>` — Convert between npub/nsec/hex formats
- `npub <value>` / `nsec <value>` — Direct conversion from bech32 format
- `hex-public <value>` / `hex-private <value>` — Direct conversion from hex format

## Architecture

### Entry Point & Routing

- `src/cli.tsx` — Entry point with custom `parseArgv()` for flags and positional args, renders Ink app
- `src/App.tsx` — Command router, maps commands to React components via switch statement

### Component Organization

```text
src/components/
├── Intro.tsx, Setup.tsx, About.tsx, Help.tsx  # Top-level screens
├── ui/Prompt.tsx                               # Reusable prompt component
├── share/                                      # Share namespace commands
│   ├── ShareSigner.tsx                         # Long-lived signer with Bifrost node
│   ├── ShareStatus.tsx                         # Peer diagnostics
│   ├── ShareLoad.tsx, ShareList.tsx, ShareAdd.tsx
│   ├── SharePolicy.tsx                         # Policy configuration
│   ├── ShareHelp.tsx                           # Share namespace help
│   └── ShareNamespaceFrame.tsx                 # Namespace UI wrapper
├── keyset/                                     # Keyset creation and management
│   ├── KeysetCreate.tsx                        # Interactive keyset generation
│   ├── KeysetLoad.tsx, KeysetList.tsx          # Load/list keysets
│   ├── KeysetSigner.tsx, KeysetStatus.tsx      # Signer and status views
│   ├── KeysetHelp.tsx                          # Keyset namespace help
│   ├── ShareSaver.tsx                          # Encrypts and persists shares
│   └── useShareEchoListener.ts                 # Echo event hook
├── keys/                                       # Key conversion utilities
│   ├── KeyConvert.tsx                          # Key format conversion
│   └── KeyHelp.tsx                             # Keys namespace help
└── relays/                                     # Relay configuration
    └── Relays.tsx
```

### Core Library (`src/keyset/`)

Non-UI utilities for share management:
- `storage.ts` — Read/write share files to disk
- `crypto.ts` — Share encryption/decryption
- `paths.ts` — Platform-specific storage paths (e.g., `~/Library/Application Support/igloo-cli/shares`)
- `policy.ts` — Per-share policy management
- `relays.ts` — Default relay configuration
- `echoRelays.ts` — Echo-specific relay configuration
- `echo.ts` — Echo event utilities for share transfer
- `awaitShareEchoCompat.ts` — Compatibility layer for echo events
- `naming.ts` — Share naming utilities
- `types.ts` — TypeScript types for shares, keysets, policies
- `index.ts` — Barrel export

### Polyfills (`src/polyfills/`)

- `websocket.ts` — WebSocket global for Node (required by nostr-tools)
- `nostr.ts` — Normalizes Nostr subscribe filters for relay compatibility

### Key Dependencies

- `@frostr/bifrost` — Reference client for node coordination and signing
- `@frostr/igloo-core` — Keyset generation, peer management
- `ink` — React-based terminal UI
- `nostr-tools` — Nostr protocol primitives

## Key Patterns

- **Ink Components**: Use `<Box>`, `<Text>` from `ink` (not HTML elements)
- **File Extensions**: All imports use `.js` extensions (TypeScript ESM requirement)
- **Flag Parsing**: Manual in `cli.tsx`, supports `--flag value`, `--flag=value`, `-f value`
- **Flag Aliases**: `-t` → `--threshold`, `-T` → `--total`, `-E` → `--debug-echo`, `-h` → `--help`, `-v` → `--version`
- **Numeric Flags**: Validated via `parseNumber()` in App.tsx

## Adding a New Command

1. Create component in appropriate `src/components/` subdirectory
2. Import in `src/App.tsx`
3. Add case to router function (`App()` switch or namespace-specific renderer like `renderShare()`)
4. Run `npm run typecheck` to verify
5. Test with `npm run dev <new-command>`

## Environment Variables

- `IGLOO_DEBUG_ECHO=1` — Enable verbose echo diagnostics (or use `--debug-echo` flag)
- `IGLOO_TEST_RELAY=wss://...` — Pin a specific relay for testing
- `IGLOO_DISABLE_RAW_MODE=1` — Disable Ink raw mode (for CI/tests)
