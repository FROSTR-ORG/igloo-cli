# 2025-10-01 — igloo-cli automation and diagnostics

## Summary
- Added non-interactive execution path for `keyset create`, including password-file support and custom output directories.
- Introduced reusable Ink prompt helper that disables raw mode when stdin is not a TTY.
- Created bifrost-backed peer diagnostics (`status` / `keyset status`) that decrypt a saved share and ping peers over configurable relays.
- Wired @frostr/igloo-core and its noble dependencies into the CLI runtime.

## Key files
- `src/components/keyset/KeysetCreate.tsx` — validates flags, boots automation mode, and routes through the new share saver.
- `src/components/keyset/ShareSaver.tsx` — handles share encryption for both interactive and headless runs (password file & output overrides).
- `src/components/keyset/KeysetStatus.tsx` — decrypts shares, connects a temporary bifrost node, and runs `checkPeerStatus` with optional relay overrides.
- `src/components/ui/Prompt.tsx` — guards against non-TTY stdin and encourages flag-based usage when raw mode is unavailable.
- `src/keyset/*` — filesystem helpers updated for custom directories plus noble-based crypto derivations.

## Dependencies
- Installed `@frostr/igloo-core`, `@frostr/bifrost`, `@noble/ciphers`, `@noble/curves`, `@noble/hashes`, and `nostr-tools` to support key generation, encryption, and diagnostics.
