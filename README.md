# igloo-cli

Command-line companion for the FROSTR signing stack, built with React, Ink, and TypeScript.

## Igloo Core Coverage

- [x] Generate and persist encrypted shares (`keyset create`, `ShareSaver`).
- [x] Import standalone shares into local storage (`share add`).
- [x] Decrypt shares and inspect credentials (`share load`).
- [x] Peer diagnostics via transient Bifrost nodes (`share status`).
- [x] Long-lived signer lifecycle with peer monitoring and logging (`igloo signer`).
- [ ] Echo transfer utilities (await/send/start echo listeners).
- [x] Policy management commands (set/update peer policies from CLI).
- [ ] Advanced diagnostics (ping monitors, multi-round diagnostics).
- [x] Key conversion helpers (npub/nsec/hex transforms).

## Requirements

- Node.js 18 or newer
- npm 10 or newer (bundled with Node 20+)

## First run

```bash
npm install
npm run build
npm link
igloo --help
```

The `npm link` step exposes local binaries named `igloo` and `igloo-cli`. Skip it if you prefer running `node dist/cli.js` directly inside the repo.

## Step-by-step: create a 2-of-3 keyset

1. **Build and link the CLI** (see commands above). Verify the install with `igloo --version`.
2. **Create the keyset interactively.** Run `igloo keyset create` and follow the prompts:
   - When asked for the total number of shares, enter `3` (or your desired total up to 16).
   - When asked for the threshold, enter `2` (any value ≤ total works).
   - Choose `generate` when prompted for the secret key so the CLI mints a fresh `nsec`/`npub` pair.
   - Supply a strong password and pick the output directory (press Enter to accept the default).
   - The success screen prints the new `nsec`—store it securely.
3. **Review the saved shares.** Run `igloo share list` to confirm three encrypted files were written. Files live under `~/Library/Application Support/igloo-cli/shares` on macOS (or the directory you chose).
4. **Optional: automate the same flow.** Provide every input as a flag to skip prompts:

   ```bash
   igloo keyset create \
     --name "team-recovery" \
     --threshold 2 \
     --total 3 \
     --nsec generate \
     --password "ExamplePassphrase123!" \
     --output ./shares
   ```

   The CLI prints the generated `nsec` and writes files such as `team-recovery_share_1.json` to `./shares`.

Use `igloo share load --share <filename>` if you need to decrypt one of the shares later (you will be prompted for the password you selected).

## Commands

Commands below assume you linked the binary and can run `igloo`. Swap in `igloo-cli` if you prefer the original name.

### Top-level commands

| Command | Description |
| --- | --- |
| `igloo` | Show the igloo welcome screen with the animated intro. |
| `igloo setup --threshold 2 --total 3` | Walk through a k-of-n bootstrap checklist for fresh operators. |
| `igloo about` | Summarize the FROSTR architecture and sibling projects. |
| `igloo status --share vault-share-1` | Decrypt a saved share and ping peers via the default relays. |
| `igloo signer --share vault-share-1 --password-file ./pass.txt` | Bring a decrypted share online as a signer until you quit. |
| `igloo relays` | Show effective and configured default relays. |
| `igloo relays set wss://a wss://b` | Set the default relays for status/signer. |
| `igloo policy --share vault-share-1` | Configure default send/receive rules and peer overrides for a share (alias of `igloo share policy`). |
| `igloo keyset create --name team --threshold 2 --total 3` | Interactive or flag-driven flow to generate, encrypt, and save shares. |
| `igloo keys convert --from nsec --value nsec1example...` | Convert between npub/nsec/hex formats using `@frostr/igloo-core`. |

### Share namespace

| Command | Description |
| --- | --- |
| `igloo share add --group bfgroup1... --share bfshare1...` | Import an encrypted share into local storage. |
| `igloo share list` | Display encrypted shares saved on this machine. |
| `igloo share load --share vault-share-1` | Decrypt a saved share and display it in the terminal. |
| `igloo share signer --share vault-share-1 --password-file ./pass.txt` | Bring a decrypted share online as a signer until you quit. |
| `igloo share status --share vault-share-1 --password-file ./pass.txt` | Connect to FROSTR relays and ping peers for a saved share. |
| `igloo share policy --share vault-share-1 --allow npub1...` | Configure default send/receive rules and peer overrides for a share. |

Saved-share operations (`add`, `list`, `load`, `signer`, `status`, `policy`) all live under the `igloo share …` namespace. Run `igloo share` without arguments for a concise help panel.

### Key conversion helpers

Use `igloo keys convert` to translate between nostr formats. Supply a key with either shorthand flags or `--from`/`--value`:

- `igloo keys convert --from nsec --value nsec1example...` → prints the private hex plus derived npub/hex public key.
- `igloo keys convert --from npub --value npub1example...` → reveals the hex public key.
- `igloo keys convert --from hex-private --value 64hexchars` → returns the corresponding nsec and derived public keys.
- `igloo keys convert --from hex-public --value 64hexchars` → returns the npub string.
- Shorthand: `igloo keys --nsec nsec1example...`, `igloo keys --npub npub1example...`, or `igloo keys hex-private 64hexchars` work without specifying `convert`.

Use `--help` or `--version` at any time for metadata.

## Automation flags

Keyset commands and the signer flow support non-interactive execution:

- `--password value` or `--password-file ./path` — supply the encryption password without prompts.
- `--output ./directory` — change where encrypted share JSON is written.
- `--share id` — target a saved share by id/name when loading, diagnosing, or running the signer.
- `--relays wss://relay1,wss://relay2` — override the relay list for status checks and the signer.
  Configure persistent defaults via `igloo relays set …`.
- `--verbose` — stream signer diagnostics (toggleable at runtime with the `l` key).
- `--log-level level` — pick signer log verbosity (`debug`, `info`, `warn`, or `error`).

Example headless keyset creation (same flow as step 4 above):

```bash
igloo keyset create \
  --name "team-recovery" \
  --threshold 2 \
  --total 3 \
  --nsec generate \
  --password "ExamplePassphrase123!" \
  --output ./shares
```

## Run a signer

Use the signer command once at least one encrypted share is saved locally:

1. **Interactive launch.** Run `igloo signer`, choose a share from the list, and enter its password. The CLI decrypts the share, connects to the default relays, and keeps the signer online until you press `q` or `Esc`.
2. **Headless launch.** Provide inputs up front to skip prompts:

   ```bash
   igloo signer --share vault-share-1 --password-file ./pass.txt --relays wss://relay.damus.io --verbose
   ```

   The process exits when you quit the signer or when relay connectivity drops.
3. **Toggle live logs.** Press `l` while the signer is running to show or hide relay diagnostics. Combine with `--verbose` (or `--log-level debug`) to start with logs visible.
4. **Readable summaries.** The on-screen log panel automatically collapses duplicate entries and replaces large payloads with concise summaries (e.g., tag, peer pubkey, relay id), keeping the view focused on actionable events.

## Diagnostics

Use either `igloo status` or `igloo share status` to decrypt a saved share, connect a temporary bifrost node, and ping each peer. The command prints relay endpoints plus a color-coded list of online/offline peers. Provide `--password` or `--password-file` for automation, and customise relays with `--relays` when needed.

## Development scripts

- `npm run dev` — run the CLI via `tsx` without bundling.
- `npm run build` — bundle to `dist/cli.js` with `tsup`.
- `npm run typecheck` — validate TypeScript types.

## Project layout

- `src/cli.tsx` — argument parsing and Ink renderer.
- `src/App.tsx` — command router and shared props.
- `src/components/Intro.tsx` — frostr-inspired intro panel.
- `src/components/Setup.tsx` — share bootstrap checklist.
- `src/components/About.tsx` — quick product overview.
- `src/components/Help.tsx` — terminal help screen.
- `src/components/keyset/*.tsx` — keyset creation, listing, and loading flows.
- `src/components/keyset/KeysetStatus.tsx` — bifrost-backed peer diagnostics.
- `src/components/keyset/KeysetSigner.tsx` — share selection and signer lifecycle.
- `src/keyset/*` — filesystem paths, crypto helpers, and share persistence.

## Next ideas

1. Allow exporting logs to disk for postmortem analysis.
2. Surface live relay/peer status in the signer UI once igloo-core exposes richer events.
3. Explore orchestrating multiple concurrent signers via child processes.
