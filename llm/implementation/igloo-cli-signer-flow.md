# igloo-cli Signer Flow Implementation

## Overview
`src/components/keyset/KeysetSigner.tsx` implements both `igloo signer` and `igloo keyset signer`. The Ink view enumerates encrypted shares, asks the operator to choose/decrypt one (or honours automation flags), then stands up a long-lived Bifrost node via `@frostr/igloo-core`. Router wiring in `src/App.tsx` exposes the commands, while `Help.tsx`, `KeysetHelp.tsx`, and the README describe the workflow.

## Phase orchestration
Local state tracks four phases:
- **select** — loads share metadata with `readShareFiles()` and prompts for a selection (name, id, or 1-based index). Automation pre-selection short-circuits this phase.
- **password** — masks input, enforces an 8+ character passphrase, and decrypts the share with `decryptShareCredential()`. Failure messages are returned to the prompt for retry.
- **starting** — shows a spinner while the signer boots. `createAndConnectNode()` is invoked with the decrypted credentials and relay list. This phase also resets log buffers.
- **running** — renders share/group/relay details, displays live logs, wires keyboard shortcuts (`q`/`Esc` to stop, `l` to toggle logs), and keeps node/peer refs updated.

## Automation & flags
Automation mirrors other keyset tooling:
- `--share` (or positional arg) targets a saved share; the component matches by id, name, or index.
- `--password` / `--password-file` preload credentials. Password files are read once, trimming the first non-empty line.
- `--relays` overrides `DEFAULT_PING_RELAYS` with a comma-delimited list.
- `--verbose` starts with logs visible (same as pressing `l`).
- `--log-level debug|info|warn|error` tunes the log filter passed to `createAndConnectNode()`.

When flags supply both share and password, the flow bypasses UI prompts entirely and jumps directly into `starting` → `running`.

## Node bootstrap & transport patches
Before any node is created we patch `nostr-tools`’ `SimplePool.subscribeMany` so single-filter arrays are unwrapped into plain objects; this silences relay complaints about malformed subscription payloads. Node bootstrap then proceeds as follows:
1. Derive the signer’s pubkey from credentials via `extractSelfPubkeyFromCredentials()` and `normalizePubkey()`.
2. Decode the group, collect peer pubkeys from its commits, normalise them, and drop the signer’s own entry.
3. Call `createAndConnectNode()` with logging enabled. `customLogger` funnels every event into local state for the UI log feed.
4. Instantiate a `PeerManager` manually (rather than `createPeerManager`) so we can seed it with the derived pubkey list and avoid igloo-core’s expectation that shares carry pubkeys. Auto-monitoring is left on, and we fire an initial `pingPeers()` to announce presence.
5. If peer derivation fails we fall back gracefully: a warning banner is shown, logs record the issue, and the signer continues without live peer monitoring.

## Logging UX
Relevant logging behaviour:
- Live logs are kept in memory (max 200 entries, last 12 rendered) and colour-coded by severity.
- `customLogger` entries are summarised before rendering: long JSON payloads become terse snippets (`tag=/ping/res id=abcd… pubkey=1234…`).
- Duplicate `Event emitted: message` chatter is filtered, and back-to-back identical summaries are deduped to reduce noise.
- Operators press `l` to toggle visibility; automation can start in verbose mode via `--verbose`.

## Lifecycle & cleanup
Node and peer-manager instances live in refs. Shutdown hygiene includes:
1. `stopSigner()` removing listeners, cleaning the `PeerManager`, calling `cleanupBifrostNode()`, and resetting view state.
2. `useEffect` teardown that invokes `stopSigner()` when the component unmounts.
3. Signal handlers for `SIGINT`/`SIGTERM` to catch Ctrl+C exits.

Listeners attached while running:
- `error` → records the failure and resets to the select screen.
- `closed` → emits a friendly status message and returns to selection.
- Keyboard input → `q`/`Esc` stops, `l` toggles logs.

## CLI integration
`App.tsx` routes `signer` and `keyset signer` to the component, adds the new command to intro examples, and continues to default to the intro screen when no command is provided. `Help.tsx` describes global flags (`--verbose`, `--log-level`, etc.), while `KeysetHelp.tsx` highlights the keyset namespace entry point and automation examples. The README now features signer-specific instructions (interactive, headless, and log toggling).

## Future considerations
- Export logs or relay diagnostics to disk for postmortems.
- Surface richer node telemetry (connected relays, peer health) inside the running view once igloo-core exposes structured events.
- Explore orchestrating multiple signers concurrently (e.g., spawning child processes or tabs for each share).
