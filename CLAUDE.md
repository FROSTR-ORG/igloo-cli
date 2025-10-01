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
npm start
# or
node dist/cli.js

# Type checking
npm run typecheck
# or
tsc --noEmit

# Test (currently just runs typecheck)
npm test

# Link binary locally for testing
npm link
igloo-cli --help
```

## Available Commands

- `igloo-cli` — Default intro screen with FROSTR-themed welcome
- `igloo-cli setup --threshold 2 --total 3` — Bootstrap checklist for k-of-n setup
- `igloo-cli about` — Product overview and architecture summary
- `igloo-cli status` — Placeholder for health probes (not yet implemented)
- `igloo-cli --help` — Help screen
- `igloo-cli --version` — Version info

Flag aliases: `-t` for `--threshold`, `-T` for `--total`

## Architecture

### Entry Point & Routing

- [src/cli.tsx](src/cli.tsx) — Entry point, parses argv, renders Ink app
  - Custom `parseArgv()` handles flags, positional args, `--help`, `--version`
  - Renders `<App>` or `<Help>` components via Ink's `render()`

- [src/App.tsx](src/App.tsx) — Command router
  - Maps commands to React components
  - Normalizes numeric flags (threshold/total) with validation

### Components

All components live in [src/components/](src/components/) and use Ink's React-like API for terminal UI:

- `Intro.tsx` — Default welcome screen
- `Setup.tsx` — Step-by-step bootstrap checklist for share distribution
- `About.tsx` — FROSTR ecosystem overview
- `Help.tsx` — Terminal help/usage screen

### Build Configuration

- [tsconfig.json](tsconfig.json) — TypeScript config targeting ES2020, NodeNext modules, strict mode
- [tsup.config.ts](tsup.config.ts) — Build tool config
  - Entry: `src/cli.tsx`
  - Output: `dist/cli.js` with shebang (`#!/usr/bin/env node`)
  - Format: ESM only
  - Target: Node 18+

### FROSTR Ecosystem Context

FROSTR splits a nostr secret key (nsec) into multiple shares using Shamir Secret Sharing. A threshold (k) of total shares (n) is required to sign messages. This CLI helps users bootstrap and manage their signing setups.

**Related Projects**:
- **@frostr/bifrost** — Reference client implementation (node coordination, signing)
- **@frostr/igloo-core** — TypeScript library for keyset management, node creation, peer management
- **Igloo Desktop** — Desktop key management app
- **Frost2x** — Browser extension (NIP-07 signer)
- **Igloo Server** — Server-based signer with ephemeral relay

The CLI provides guidance for setting up these components together. Users typically:
1. Generate an nsec in Igloo Desktop
2. Split into k-of-n shares
3. Distribute shares across signers (Desktop, Frost2x, cold storage)
4. Configure shared relay URLs
5. Use the setup to sign nostr events transparently

## Key Patterns

- **Ink Components**: Use `<Box>`, `<Text>`, etc. from `ink` for terminal UI (not HTML)
- **Argument Parsing**: Handled manually in cli.tsx, supports `--flag value`, `--flag=value`, `-f value`
- **Command Routing**: Switch statement in App.tsx based on normalized command string
- **File Extensions**: All imports must use `.js` extensions (TypeScript ESM requirement) even though source files are `.tsx`

## Common Tasks

### Adding a New Command

1. Create component in [src/components/](src/components/)
2. Import in [src/App.tsx](src/App.tsx)
3. Add case to switch statement in `App()` function
4. Update command examples in `Intro.tsx` if applicable
5. Run `npm run typecheck` to verify
6. Test with `npm run dev <new-command>`

### Adding Command Flags

1. Parse in [src/cli.tsx](src/cli.tsx) `parseArgv()` if custom logic needed
2. Extract in [src/App.tsx](src/App.tsx) from `flags` prop
3. Pass as props to component
4. Add validation/defaults as needed (see `parseNumber()` example)

### Building for Distribution

```bash
npm run build
# Output: dist/cli.js with shebang, ESM format
# Test: node dist/cli.js [command]
```
