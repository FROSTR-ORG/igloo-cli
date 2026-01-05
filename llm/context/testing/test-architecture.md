# Test Architecture Overview

## Test Framework

igloo-cli uses **Node.js native test runner** (`node:test`) with `node:assert/strict` for assertions. Tests are executed via `tsx --test` for TypeScript support without precompilation.

```bash
npm test           # Full test suite (typecheck + build + test)
npm run test:bun   # Alternative Bun runtime
npx tsx --test tests/specific.test.ts  # Run single test file
```

---

## Test File Organization

```
tests/
├── helpers/
│   ├── runCli.ts       # CLI process spawner for integration tests
│   └── tmp.ts          # Temp directory utilities (makeTmp, writePasswordFile)
├── awaitShareEchoCompat.test.ts  # Echo payload validation
├── cli.basic.test.ts             # Command routing, help, version
├── cli.keys.convert.test.ts      # Key format conversion
├── cli.parsing.test.ts           # Argument parsing (parseArgv, toBool)
├── cli.relays.command.test.ts    # Relay CLI commands
├── cli.share.flow.test.ts        # Share add/list/load workflow
├── crypto.test.ts                # Share encryption/decryption
├── echoRelays.test.ts            # Echo relay computation
├── naming.test.ts                # Keyset naming utilities
├── paths.test.ts                 # Platform-specific paths
├── policy.test.ts                # Share policy management
├── relays.test.ts                # Relay persistence
└── storage.test.ts               # Share file I/O
```

---

## Test Categories

### 1. Unit Tests (Pure Functions)

Test isolated functions with no external dependencies or side effects.

**Files:**
- `crypto.test.ts` - Cryptographic primitives
- `policy.test.ts` - Policy normalization and manipulation
- `cli.parsing.test.ts` - Argument parsing
- `naming.test.ts` - String slugification and ID building
- `paths.test.ts` - Path construction
- `echoRelays.test.ts` - Relay URL normalization

**Pattern:**
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';
import {someFunction} from '../src/module.js';

test('someFunction does something', () => {
  const result = someFunction(input);
  assert.equal(result, expectedOutput);
});
```

### 2. File I/O Tests

Test functions that read/write to the filesystem using isolated temp directories.

**Files:**
- `storage.test.ts` - Share record persistence
- `relays.test.ts` - Relay config persistence
- `naming.test.ts` - `keysetNameExists()` function

**Pattern:**
```typescript
import {test, beforeEach, afterEach} from 'node:test';
import fs from 'node:fs/promises';
import {makeTmp} from './helpers/tmp.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await makeTmp('igloo-tests-');
  process.env.IGLOO_APPDATA = tmpDir;  // Redirect storage
});

afterEach(async () => {
  delete process.env.IGLOO_APPDATA;
  await fs.rm(tmpDir, {recursive: true, force: true});
});

test('file operation test', async () => {
  // Test uses tmpDir, isolated from real app data
});
```

### 3. Integration Tests (CLI Process)

Spawn actual CLI process and verify stdout/stderr/exit codes.

**Files:**
- `cli.basic.test.ts` - Command routing
- `cli.keys.convert.test.ts` - Key conversion commands
- `cli.relays.command.test.ts` - Relay management commands
- `cli.share.flow.test.ts` - End-to-end share workflow

**Pattern:**
```typescript
import {runCli} from './helpers/runCli.js';

test('command produces expected output', async () => {
  const {stdout, exitCode} = await runCli(['command', '--flag', 'value'], {
    timeoutMs: 15000,
    env: {IGLOO_TEST_AUTOPILOT: '1'},
    successPattern: /Expected output/
  });

  assert.equal(exitCode, 0);
  assert.match(stdout, /Expected output/);
});
```

---

## Test Helpers

### `tests/helpers/tmp.ts`

```typescript
// Create isolated temp directory
export async function makeTmp(prefix = 'igloo-tests-'): Promise<string>

// Create password file for automation tests
export async function writePasswordFile(dir: string, password = 'testpassword123'): Promise<string>
```

### `tests/helpers/runCli.ts`

Spawns CLI process with full environment control:

```typescript
type RunCliOptions = {
  cwd?: string;                    // Working directory
  env?: Record<string, string>;    // Environment variables
  input?: string;                  // Stdin content
  timeoutMs?: number;              // Max execution time (default: 15000)
  successPattern?: RegExp;         // Kill process when pattern matches
};

type RunCliResult = {
  exitCode: number;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

export async function runCli(args: string[], options?: RunCliOptions): Promise<RunCliResult>
```

---

## Environment Variables for Testing

| Variable | Purpose |
|----------|---------|
| `IGLOO_APPDATA` | Override application data directory (isolates file I/O tests) |
| `IGLOO_DISABLE_RAW_MODE` | Disable Ink raw mode for CI/non-TTY environments |
| `IGLOO_SKIP_ECHO` | Skip network echo diagnostics |
| `IGLOO_TEST_AUTOPILOT` | Enable automated/non-interactive mode |
| `IGLOO_AUTOPASSWORD` | Auto-supply password for share decryption |
| `IGLOO_TEST_RELAY` | Pin a specific relay for testing |

---

## Coverage by Module

### `src/keyset/crypto.ts` (~35 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `getIterationsForShareVersion()` | 3 | Version → iteration count mapping |
| `deriveSecret()` | 6 | PBKDF2 key derivation |
| `encryptPayload()` | 4 | AES-GCM encryption |
| `decryptPayload()` | 5 | Decryption + error handling |
| `randomSaltHex()` | 2 | Salt generation |
| `assertShareCredentialFormat()` | 2 | bfshare prefix validation |
| `decryptShareCredential()` | 8 | Multi-format decryption (v0/v1) |
| Constants | 3 | Export verification |
| Integration | 1 | Full roundtrip test |

### `src/keyset/policy.ts` (~35 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `createDefaultPolicy()` | 5 | Default policy creation |
| `ensurePolicy()` | 5 | Policy normalization |
| `setPolicyDefaults()` | 3 | Update default permissions |
| `upsertPeerPolicy()` | 4 | Add/update peer rules |
| `removePeerPolicy()` | 3 | Remove peer rules |
| `updatePolicyTimestamp()` | 1 | Timestamp management |
| `pruneEmptyPeers()` | 2 | Cleanup empty peers |
| `coerceBoolean()` (internal) | 9 | Tested via ensurePolicy |
| Immutability | 1 | Verify functions don't mutate |
| Constants | 2 | DEFAULT_POLICY_DEFAULTS |

### `src/keyset/storage.ts` (~23 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `ensureShareDirectory()` | 4 | Directory creation |
| `readShareFiles()` | 7 | List all shares |
| `saveShareRecord()` | 6 | Persist share to disk |
| `loadShareRecord()` | 5 | Load by id or filepath |
| Integration | 1 | Save → load roundtrip |

### `src/lib/parseArgv.ts` (~22 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `parseArgv()` | 17 | Positionals, flags, aliases |
| `toBool()` | 5 | String → boolean coercion |

### `src/keyset/naming.ts` (~11 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `slugifyKeysetName()` | 5 | Name → slug conversion |
| `buildShareId()` | 2 | Generate share ID |
| `buildShareFilePath()` | 1 | Full path construction |
| `keysetNameExists()` | 3 | Check for existing shares |

### `src/keyset/paths.ts` (~6 tests)

| Function | Tests | Notes |
|----------|-------|-------|
| `getAppDataPath()` | 4 | Platform-specific paths, env override |
| `getShareDirectory()` | 2 | Shares subdirectory |

---

## Dependency Coverage

The upstream `@frostr/igloo-core` library has comprehensive tests covering:
- Key splitting and recovery
- Policy normalization and application
- Credential validation (nsec, hex, bfshare, bfgroup)
- Node lifecycle and peer communication
- Echo signaling protocol

**igloo-cli does NOT re-test** functionality covered by igloo-core. CLI tests focus on:
- CLI-specific argument parsing
- Local share encryption/storage (not covered upstream)
- File I/O and persistence
- Integration with the CLI

---

## Testing Best Practices

### 1. Isolation
- Each test gets fresh temp directories
- Environment variables are saved/restored in beforeEach/afterEach
- No shared mutable state between tests

### 2. Determinism
- Use fixed timestamps and salts for cryptographic tests
- Use `IGLOO_SKIP_ECHO` to avoid network dependencies
- Tests should pass regardless of execution order

### 3. Cleanup
- Always remove temp directories in `afterEach`
- Restore original environment variables

### 4. Timeouts
- CLI integration tests use explicit timeouts (default: 15s)
- Long-running crypto tests (PBKDF2) may take several seconds

### 5. Pattern-Based Success Detection
- Use `successPattern` in runCli to detect async operation completion
- Avoids arbitrary sleep() calls

---

## Running Tests

```bash
# Full suite (recommended)
npm test

# Individual test file
npx tsx --test tests/crypto.test.ts

# Multiple specific files
npx tsx --test tests/policy.test.ts tests/storage.test.ts

# Watch mode (not built-in, use nodemon or similar)
npx nodemon --exec "npx tsx --test tests/policy.test.ts"
```

---

## Adding New Tests

1. Create test file in `tests/` with `.test.ts` extension
2. Import from `node:test` and `node:assert/strict`
3. For file I/O tests, use `IGLOO_APPDATA` pattern with `makeTmp()`
4. For CLI tests, use `runCli()` helper
5. Run `npm test` to verify
