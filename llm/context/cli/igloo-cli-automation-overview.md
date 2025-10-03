# igloo-cli Automation + Diagnostics Overview

- `keyset create` mirrors Igloo Desktop's workflow but now operates headlessly when flags are supplied:
  - `--password` or `--password-file` feed the AES-GCM password (PBKDF2-SHA256, c=32, dkLen=32).
  - `--output` directs encrypted share JSON to an arbitrary directory while preserving desktop-compatible naming.
  - `--nsec generate` triggers in-process nostr key generation (ed25519 via noble) for automated setups.
- The CLI persists shares as `{slug}_share_{index}.json` with payloads matching Igloo Desktop (salt + AES-GCM ciphertext).
- Status diagnostics decrypt a saved share, spin up a transient bifrost node, and execute `checkPeerStatus` against either the default ping relays or `--relays` overrides.
- For non-TTY environments, prompts are disabled and users are instructed to rely on the automation flags.
- `keys convert` exposes nostr format translations (npub/nsec ↔ hex). Provide a key via shorthand flags (`--npub`, `--nsec`, `--hex-public`, `--hex-private`) or `--from`/`--value` for scripting; raw 64-character hex requires an explicit type (`--from hex-public|hex-private` or `--hex` paired with `--kind public|private`).
