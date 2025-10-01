# Keyset Creation Automation

## Purpose
Enable `igloo-cli keyset create` to mirror Igloo Desktop's UX while supporting headless operation for CI/scripts.

## Flag-driven flow
- `--name`, `--threshold`, `--total`, `--nsec` populate the form without prompts.
- `--password` or `--password-file` pre-fill the share encryption password. File mode reads the first line, trims it, and rejects passwords shorter than 8 characters.
- `--output` changes the target directory for encrypted share JSON. Directory is created lazily via `ensureShareDirectory(dirOverride)`.
- Absence of automation flags falls back to interactive prompts rendered by Ink; raw-mode constraints are handled at the prompt layer.

## Implementation notes
- `src/components/keyset/KeysetCreate.tsx`
  - Loads existing share metadata to enforce name uniqueness.
  - Generates nostr keys with noble ed25519 when `--nsec generate` is supplied.
  - Switches to a busy/"preparing" screen when automation inputs are being resolved (password files, key material).
  - After generating a keyset via `generateKeysetWithSecret`, renders `ShareSaver` with automation context.
- `src/components/keyset/ShareSaver.tsx`
  - Executes PBKDF2-SHA256 (c=32, dkLen=32) and AES-GCM encryption in a loop when automation password is present.
  - Persists files to the override directory (if provided) or the standard app data path and records results for summary output.
  - Maintains compatibility with the interactive flow (skip/save per share) when automation is not requested.
- `src/components/ui/Prompt.tsx`
  - Guards against non-TTY stdin by disabling raw mode and instructing the user to rely on flags.

## Output artifacts
- Encrypted shares follow the desktop naming convention `<slug>_share_<index>.json`.
- Records include `groupCredential`, `salt`, `share` (ciphertext), timestamp, and recovery metadata, ensuring interoperability with Igloo Desktop and other FROSTR tools.
