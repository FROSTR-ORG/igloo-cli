# igloo-cli Signer Flow Implementation

## Overview
The signer flow lives in `src/components/keyset/KeysetSigner.tsx` and exposes two entry points: `igloo signer` and `igloo keyset signer`. The Ink component mirrors the keyset tooling: it enumerates encrypted share files, prompts for a password (or consumes `--password`/`--password-file`), decrypts the chosen share, and spawns a Bifrost node via `@frostr/igloo-core` that stays online until the user quits. Command routing is wired in `src/App.tsx`, while the CLI help/intro text advertises the new command so operators can discover it quickly.

## Phase orchestration
The UI advances through four phases stored in local state: `select`, `password`, `starting`, and `running`.
- **select** lists available shares (via `readShareFiles`) and prompts the user (or automation) to choose one. It supports numeric indexes, ids, and names, matching the behaviour of `keyset load` and `keyset status`.
- **password** masks input and validates an 8+ character passphrase. Once provided, the share is decrypted with `deriveSecret` + `decryptPayload` into a raw share credential.
- **starting** indicates the node is connecting. The component calls `createAndConnectNode` with the decrypted share, group credential, and relay list (defaults to `DEFAULT_PING_RELAYS`, overrideable with `--relays`).
- **running** renders signer metadata (share index, group credential, selected relays) and listens for `q`/`Esc` input to stop the node. Listeners on `error` and `closed` events funnel feedback to the user and reset the flow.

## Automation support
Automation mirrors the diagnostics flow:
- `--share` or positional args preselect a share.
- `--password` or `--password-file` preload the password. File reads run through `fs.promises.readFile` and pick the first non-empty line.
- Once flags resolve, the component skips interactive prompts, immediately decrypts the share, and transitions into `starting` → `running`. Password length is validated before attempting to decrypt so automation failures surface early.

## Node lifecycle & cleanup
A `useRef` stores the active node. Cleanup happens in three places:
1. `useEffect` teardown ensures `cleanupBifrostNode` runs when the component unmounts.
2. Signal handlers (`SIGINT`, `SIGTERM`) call the same cleanup routine so background nodes never leak when the process exits abruptly.
3. The `stopSigner` helper sets a guard (`closingRef`) to avoid double-cleanup, resets state, and clears the password so the next signer run always asks for fresh credentials.

While running, the component registers listeners on the node:
- `error` reports the message inline without crashing the app.
- `closed` calls `stopSigner` unless the user already requested shutdown.
This keeps the UX consistent between interactive and automated sessions, providing clear feedback when relays disconnect.

## CLI integration
`App.tsx` routes both `signer` and `keyset signer` to the new component and updates the intro examples to highlight the command. `Help.tsx` and `KeysetHelp.tsx` document the signer flow, while the README now contains interactive and headless walkthroughs. The command table clarifies that `igloo signer` is the preferred alias and that the keyset namespace is an equivalent wrapper.

## Future considerations
- Allow custom logging verbosity for `createAndConnectNode` so operators can surface relay events in CI.
- Surface real-time node status (connected relays, peer count) inside the running phase; the plumbing is ready once `igloo-core` exposes richer events.
- Reuse this component to manage multiple signers concurrently by letting operators spawn additional nodes in child processes.
