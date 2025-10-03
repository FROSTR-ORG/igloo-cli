# Share Storage Format

## Filesystem layout
- Base directory: platform-dependent application data path (`src/keyset/paths.ts`).
  - macOS: `~/Library/Application Support/igloo/shares`
  - Windows: `%APPDATA%\igloo\shares`
  - Linux: `${XDG_CONFIG_HOME:-~/.config}/igloo/shares`
- Optional override: `--output` flag instructs `ShareSaver` to persist into a custom directory.

## Record structure (`ShareFileRecord`)
```json
{
  "id": "vault_share_1",
  "name": "vault share 1",
  "share": "<base64url ciphertext>",
  "salt": "<hex salt>",
  "groupCredential": "bfgroup...",
  "version": 1,
  "savedAt": "2025-10-01T00:00:00.000Z",
  "metadata": {
    "createdBy": "igloo-cli",
    "pbkdf2Iterations": 600000,
    "passwordEncoding": "sha256"
  },
  "keysetName": "vault",
  "index": 1
}
```
- `version` signals the share file schema. Writers now emit `1` per the Igloo Desktop spec; missing `version` implies legacy behaviour.
- `share` contains a 24-byte IV prepended to AES-256-GCM ciphertext, encoded as base64url.
- `salt` is a 16-byte hex string used as PBKDF2 input.
- `metadata` is optional and may hold future annotations; CLI currently tags the creator, PBKDF2 iterations, and password encoding. Older writers omitted metadata entirely.

## PBKDF2 iterations
- Version 1 files now use **600 000** iterations (`SHARE_FILE_PBKDF2_ITERATIONS`).
- Older CLI builds that emitted version 1 files with **100 000** iterations remain readable—the loader retries that count automatically.
- Legacy files (no `version`) fall back to **32** iterations to remain compatible with early exports.
- `deriveSecret(password, saltHex, iterations)` accepts an explicit iteration count so consumers can switch based on file metadata.

- `SHARE_FILE_VERSION` / `SHARE_FILE_PBKDF2_ITERATIONS` constants centralise spec values.
- `getIterationsForShareVersion(version)` chooses the correct PBKDF2 round count.
- `deriveSecret(password, salt, iterations, encoding)` hashes the password with SHA-256 when `encoding === 'sha256'` (the default) before running PBKDF2 and returns a 32-byte hex key.
- Writers zero-pad the 16-byte salt to 32 bytes before calling PBKDF2 so Igloo CLI and Desktop derive identical secrets. Readers retry with both 16-byte and 32-byte salt lengths for compatibility with early CLI exports.
- `encryptPayload(secret, payload)` and `decryptPayload(secret, encoded)` wrap AES-GCM.
- `decryptShareCredential(record, password)` iterates through password encodings (`sha256`, `raw`), PBKDF2 round counts, IV lengths (24-byte modern, 12-byte legacy), and salt lengths (16-byte modern, zero-padded 32-byte legacy) so both CLI- and Desktop-authored files remain readable without flagging.
- `assertShareCredentialFormat(credential)` throws if the share prefix is missing before encryption.

## Storage helpers (`src/keyset/storage.ts`)
- `saveShareRecord` writes formatted JSON with `version: 1` and metadata; directory creation still goes through `ensureShareDirectory`.
- `readShareFiles` parses all `.json` files under the share directory, returning `ShareMetadata` (record + `filepath`) for listing / selection.
- `loadShareRecord` supports direct lookups by id or explicit filepath for diagnostics and signer automation.

## Runtime usage
- `ShareSaver` hashes passwords with the v1 iteration count, emits the new schema, and adds a `createdBy` metadata hint.
- `KeysetLoad`, `KeysetStatus`, and `KeysetSigner` rely on `decryptShareCredential`, so they transparently open both legacy and v1 files.
- UI components tolerate missing optional fields (`savedAt`, `index`) when rendering legacy entries.

## Interoperability guarantees
- CLI output matches Igloo Desktop’s v1 format, ensuring shares can be exchanged between tools.
- Backwards compatibility is preserved for pre-v1 files—users can load and re-save old shares, automatically upgrading them to the new iteration count and schema.
