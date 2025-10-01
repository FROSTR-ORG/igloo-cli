# Share Storage Format

## Filesystem layout
- Base directory: platform-dependent application data path (`src/keyset/paths.ts`).
  - macOS: `~/Library/Application Support/igloo/shares`
  - Windows: `%APPDATA%\igloo\shares`
  - Linux: `${XDG_CONFIG_HOME:-~/.config}/igloo/shares`
- Optional override: `--output` flag passes through to `saveShareRecord` via `ShareSaver`.

## Record structure (`ShareFileRecord`)
```json
{
  "id": "vault_share_1",
  "name": "vault share 1",
  "keysetName": "vault",
  "index": 1,
  "share": "<base64url ciphertext>",
  "salt": "<hex salt>",
  "groupCredential": "bfgroup...",
  "savedAt": "2025-10-01T00:00:00.000Z"
}
```
- `share` is AES-GCM ciphertext prefixed with the IV (24 bytes) and encoded as base64url.
- `salt` is a 16-byte hex string used with PBKDF2-SHA256 (c=32, dkLen=32).
- `groupCredential` mirrors the bech32 group string needed to decode share metadata in other apps.

## API surface
- `ensureShareDirectory(dirOverride?)`: creates directories recursively before writes.
- `saveShareRecord(record, {directory})`: persists the JSON file using the provided directory (if any).
- `readShareFiles()`: parses all JSON files, ignoring malformed ones, and returns `ShareMetadata` with absolute file paths for listing / selection.
- `loadShareRecord({id, filepath})`: optional helper for targeted reads used by diagnostics.

## Crypto helpers (`src/keyset/crypto.ts`)
- `deriveSecret(password, saltHex)` → 32-byte hex secret using noble PBKDF2/sha256.
- `encryptPayload(secretHex, payload)` → `{cipherText, iv}` using noble AES-GCM.
- `decryptPayload(secretHex, cipherText)` → plaintext share string.
- `randomSaltHex()` → 16-byte salt for new share encryption.

## Interoperability
- Format mirrors Igloo Desktop’s `SaveShare` modal output, ensuring cross-app import/export compatibility.
- Desktop and CLI share naming conventions (`slug_share_index`) so collisions are avoided when both clients operate on the same filesystem.
