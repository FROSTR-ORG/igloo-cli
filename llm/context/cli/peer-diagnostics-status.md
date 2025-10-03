# Peer Diagnostics (`status` / `share status`)

## Goal
Provide a CLI flow to verify relay reachability and peer liveness using existing encrypted shares, paralleling the health checks planned for Igloo Desktop.

## Entry points
- `igloo-cli status` — top-level alias routed through `App` to `ShareStatus` with full flag support.
- `igloo-cli share status [--share id]` — canonical share namespace command.

## Flags
- `--password` / `--password-file` — decrypt the share without prompting.
- `--share value` — choose a specific saved share by id or name (default prompt picks from list).
- `--relays wss://relay1,wss://relay2` — override default ping relays from `@frostr/igloo-core`.

## Diagnostics flow (`src/components/share/ShareStatus.tsx` → `KeysetStatus`)
1. Load saved shares via `readShareFiles()` and optional `--share` preselection.
2. Resolve automation password (direct or file) before prompting; error out early if not available.
3. Derive the AES key with `deriveSecret` and decrypt the share using `decryptPayload`.
4. Spin up a transient bifrost node with `createAndConnectNode`, suppressing noisy logging.
5. Call `checkPeerStatus(groupCredential, shareCredential)` to ping each peer and collect `online/offline` results.
6. Close the node via `closeNode`, ignoring failures to avoid masking diagnostics output.
7. Render relays and peer statuses (green/red) or detailed error messages if the run failed.

## Error handling
- Password issues (length, wrong password) are surfaced before attempting network calls.
- Password-file read errors are reported immediately, keeping the CLI non-interactive friendly.
- Node or relay failures bubble up through the `NodeError` message for simple debugging.

## Dependencies
- Requires `@frostr/igloo-core` and `@frostr/bifrost` to build nodes and run peer pings.
- Relies on noble crypto helpers for decrypting local share files.
