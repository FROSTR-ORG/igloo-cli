import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {getAppDataPath, getShareDirectory} from '../src/keyset/paths.js';

// =============================================================================
// getAppDataPath
// =============================================================================

test('getAppDataPath respects IGLOO_APPDATA env override', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    process.env.IGLOO_APPDATA = '/custom/override/path';
    const result = getAppDataPath();
    assert.equal(result, '/custom/override/path');
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

test('getAppDataPath handles empty IGLOO_APPDATA (falls through to platform)', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    process.env.IGLOO_APPDATA = '';
    const result = getAppDataPath();
    // Should NOT be empty string - should fall through to platform logic
    assert.ok(result.length > 0);
    assert.notEqual(result, '');
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

test('getAppDataPath returns platform-appropriate path', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    delete process.env.IGLOO_APPDATA;
    const result = getAppDataPath();
    const platform = os.platform();

    if (platform === 'darwin') {
      // macOS: should be ~/Library/Application Support
      assert.ok(
        result.includes('Library/Application Support'),
        `Expected macOS path to contain "Library/Application Support", got: ${result}`
      );
    } else if (platform === 'win32') {
      // Windows: should be APPDATA or AppData/Roaming
      assert.ok(
        result.includes('AppData') || result.includes('appdata'),
        `Expected Windows path to contain "AppData", got: ${result}`
      );
    } else {
      // Linux/other: should be XDG_CONFIG_HOME or ~/.config
      const xdgConfig = process.env.XDG_CONFIG_HOME;
      if (xdgConfig) {
        assert.equal(result, xdgConfig);
      } else {
        assert.ok(
          result.includes('.config') || result === path.join(os.homedir(), '.config'),
          `Expected Linux path to contain ".config", got: ${result}`
        );
      }
    }
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

test('getAppDataPath returns absolute path', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    delete process.env.IGLOO_APPDATA;
    const result = getAppDataPath();
    assert.ok(path.isAbsolute(result), `Expected absolute path, got: ${result}`);
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

// =============================================================================
// getShareDirectory
// =============================================================================

test('getShareDirectory appends igloo/shares to app data path', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    process.env.IGLOO_APPDATA = '/test/appdata';
    const result = getShareDirectory();
    assert.equal(result, path.join('/test/appdata', 'igloo', 'shares'));
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});

test('getShareDirectory returns absolute path', () => {
  const original = process.env.IGLOO_APPDATA;
  try {
    delete process.env.IGLOO_APPDATA;
    const result = getShareDirectory();
    assert.ok(path.isAbsolute(result), `Expected absolute path, got: ${result}`);
    assert.ok(result.endsWith(path.join('igloo', 'shares')));
  } finally {
    if (original !== undefined) {
      process.env.IGLOO_APPDATA = original;
    } else {
      delete process.env.IGLOO_APPDATA;
    }
  }
});
