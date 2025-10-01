# igloo-cli

Command-line companion for the FROSTR signing stack, built with React, Ink, and TypeScript.

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
3. **Review the saved shares.** Run `igloo keyset list` to confirm three encrypted files were written. Files live under `~/Library/Application Support/igloo-cli/shares` on macOS (or the directory you chose).
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

Use `igloo keyset load --share <filename>` if you need to decrypt one of the shares later (you will be prompted for the password you selected).

## Commands

Commands below assume you linked the binary and can run `igloo`. Swap in `igloo-cli` if you prefer the original name.

| Command | Description |
| --- | --- |
| `igloo` | Show the igloo welcome screen with a frostr-themed snowflake. |
| `igloo setup --threshold 2 --total 3` | Walk through a k-of-n bootstrap checklist. |
| `igloo about` | Summarize the frostr architecture and sibling projects. |
| `igloo status` | Placeholder for upcoming health probes. |
| `igloo keyset create` | Interactive flow to generate, encrypt, and save shares. |
| `igloo keyset list` | Display encrypted shares saved on this machine. |
| `igloo keyset load` | Decrypt a saved share and display it in the terminal. |
| `igloo keyset status` | Connect to FROSTR relays and ping peers for a saved share. |

Use `--help` or `--version` at any time for metadata.

## Automation flags

All keyset subcommands now support non-interactive execution:

- `--password value` or `--password-file ./path` — supply the encryption password without prompts.
- `--output ./directory` — change where encrypted share JSON is written.
- `--share id` — target a saved share by id/name when loading or running diagnostics.
- `--relays wss://relay1,wss://relay2` — override the relay list for status checks.

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

## Diagnostics

Use either `igloo status` or `igloo keyset status` to decrypt a saved share, connect a temporary bifrost node, and ping each peer. The command prints relay endpoints plus a color-coded list of online/offline peers. Provide `--password` or `--password-file` for automation, and customise relays with `--relays` when needed.

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
- `src/keyset/*` — filesystem paths, crypto helpers, and share persistence.

## Next ideas

1. Implement the `status` command to query connected bifrost nodes.
2. Persist workspace preferences (default thresholds, relay lists).
3. Import frostr account metadata for richer onboarding prompts.
