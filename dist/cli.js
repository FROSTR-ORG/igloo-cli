#!/usr/bin/env node

// src/cli.tsx
import { render } from "ink";

// src/components/Intro.tsx
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function Intro({ version, commandExamples }) {
  return /* @__PURE__ */ jsxs(Box, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", alignItems: "center", children: [
      /* @__PURE__ */ jsx(Text, { color: "cyanBright", children: "IGLOO CLI" }),
      /* @__PURE__ */ jsx(Text, { color: "white", children: "FROSTR remote signing toolkit" }),
      /* @__PURE__ */ jsxs(Text, { color: "gray", children: [
        "version ",
        version
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { color: "cyan", children: "What you can do right now" }),
      /* @__PURE__ */ jsx(Text, { children: "- igloo-cli setup -- bootstrap a FROSTR signing stack" }),
      /* @__PURE__ */ jsx(Text, { children: "- igloo-cli about -- learn about the protocol" }),
      /* @__PURE__ */ jsx(Text, { children: "- igloo-cli status -- quick health probes (coming soon)" })
    ] }),
    /* @__PURE__ */ jsxs(Box, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx(Text, { color: "cyan", children: "Quick start" }),
      commandExamples.map((example) => /* @__PURE__ */ jsxs(Text, { children: [
        "\u203A ",
        example
      ] }, example))
    ] })
  ] });
}

// src/components/Setup.tsx
import { Box as Box2, Text as Text2 } from "ink";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function Setup({ threshold, total }) {
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx2(Text2, { color: "cyanBright", children: "Bootstrap your FROSTR signing circle" }),
    /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { children: "1. Launch Igloo Desktop and create a fresh nsec." }),
      /* @__PURE__ */ jsxs2(Text2, { children: [
        "2. Split it into a ",
        threshold,
        "/",
        total,
        " share set; stash the recovery share offline."
      ] }),
      /* @__PURE__ */ jsx2(Text2, { children: "3. Load one share into Igloo Desktop, configure nostr relays, and start the local signer." }),
      /* @__PURE__ */ jsx2(Text2, { children: "4. Load an additional share into Frost2x or another remote signer so it can co-sign requests." }),
      /* @__PURE__ */ jsx2(Text2, { children: "5. Share relay URLs with every signer; all nodes must speak on the same relays." })
    ] }),
    /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx2(Text2, { color: "cyan", children: "Next actions" }),
      /* @__PURE__ */ jsx2(Text2, { children: '- "igloo-cli status" -- planned: probe connected signers.' }),
      /* @__PURE__ */ jsx2(Text2, { children: '- "igloo-cli rotate" -- planned: guide share rotation drills.' })
    ] })
  ] });
}

// src/components/About.tsx
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function About() {
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx3(Text3, { color: "cyanBright", children: "Why FROSTR" }),
    /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx3(Text3, { children: "- Break any nsec into durable Shamir shares." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Compose flexible k-of-n multi signer networks." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Keep your npub and signature shapes unchanged." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Rotate shares on demand without touching clients." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Communicate over encrypted nostr relays via bifrost." })
    ] }),
    /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx3(Text3, { color: "cyan", children: "Other Igloo projects" }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Igloo Desktop: local signing device and share manager." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Frost2x: browser signer that speaks NIP-07 and NIP-46." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Igloo Server: personal relay and signing service." }),
      /* @__PURE__ */ jsx3(Text3, { children: "- Igloo Mobile and Serverless: upcoming footprints." })
    ] })
  ] });
}

// src/components/keyset/KeysetCreate.tsx
import { useEffect, useMemo as useMemo2, useState as useState3 } from "react";
import { Box as Box6, Text as Text6 } from "ink";
import path4 from "path";
import fs3 from "fs/promises";
import { nip19 } from "nostr-tools";
import { ed25519 } from "@noble/curves/ed25519.js";
import { randomBytes as randomBytes2 } from "crypto";
import { generateKeysetWithSecret } from "@frostr/igloo-core";

// src/keyset/paths.ts
import os from "os";
import path from "path";
function getAppDataPath() {
  const platform = os.platform();
  if (platform === "win32") {
    return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  }
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  }
  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
}
function getShareDirectory() {
  return path.join(getAppDataPath(), "igloo", "shares");
}

// src/keyset/storage.ts
import { promises as fs } from "fs";
import path2 from "path";
async function ensureShareDirectory(dirOverride) {
  const dir = dirOverride ?? getShareDirectory();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}
async function readShareFiles() {
  const dir = getShareDirectory();
  try {
    const files = await fs.readdir(dir);
    const shareFiles = files.filter((file) => file.endsWith(".json"));
    const entries = [];
    for (const file of shareFiles) {
      const filepath = path2.join(dir, file);
      try {
        const raw = await fs.readFile(filepath, "utf8");
        const data = JSON.parse(raw);
        entries.push({
          ...data,
          filepath
        });
      } catch (error) {
      }
    }
    return entries;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
async function saveShareRecord(record, options = {}) {
  const dir = await ensureShareDirectory(options.directory);
  const filepath = path2.join(dir, `${record.id}.json`);
  await fs.writeFile(filepath, JSON.stringify(record, null, 2), "utf8");
  return filepath;
}

// src/keyset/crypto.ts
import { randomBytes } from "crypto";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";
function hexToUint8(hex, expectedLength) {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  if (expectedLength !== void 0 && bytes.length !== expectedLength) {
    throw new Error(`Expected ${expectedLength} bytes, received ${bytes.length}`);
  }
  return bytes;
}
function uint8ToHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}
function stringToUint8(value) {
  return new TextEncoder().encode(value);
}
function deriveSecret(password, saltHex) {
  const passwordBytes = stringToUint8(password);
  const saltBytes = hexToUint8(saltHex, 16);
  const derived = pbkdf2(sha256, passwordBytes, saltBytes, { c: 32, dkLen: 32 });
  return uint8ToHex(derived);
}
function encryptPayload(secretHex, payload, ivHex) {
  const payloadBytes = stringToUint8(payload);
  const secretBytes = hexToUint8(secretHex, 32);
  const ivBytes = ivHex ? hexToUint8(ivHex, 24) : new Uint8Array(randomBytes(24));
  const cipher = gcm(secretBytes, ivBytes);
  const encrypted = cipher.encrypt(payloadBytes);
  const combined = new Uint8Array(ivBytes.length + encrypted.length);
  combined.set(ivBytes, 0);
  combined.set(encrypted, ivBytes.length);
  const cipherText = Buffer.from(combined).toString("base64url");
  return {
    cipherText,
    iv: uint8ToHex(ivBytes)
  };
}
function decryptPayload(secretHex, encoded) {
  const combined = Buffer.from(encoded, "base64url");
  const iv = combined.subarray(0, 24);
  const encrypted = combined.subarray(24);
  const secretBytes = hexToUint8(secretHex, 32);
  const cipher = gcm(secretBytes, iv);
  const decrypted = cipher.decrypt(encrypted);
  return new TextDecoder().decode(decrypted);
}
function randomSaltHex() {
  return Buffer.from(randomBytes(16)).toString("hex");
}

// src/keyset/naming.ts
import path3 from "path";
import { promises as fs2 } from "fs";
function slugifyKeysetName(name) {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "keyset";
}
function buildShareId(keysetName, index) {
  const slug = slugifyKeysetName(keysetName);
  return `${slug}_share_${index}`;
}
async function keysetNameExists(name) {
  const dir = getShareDirectory();
  try {
    const files = await fs2.readdir(dir);
    const slug = slugifyKeysetName(name);
    return files.some((file) => file.startsWith(`${slug}_share_`));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

// src/components/ui/Prompt.tsx
import { useState } from "react";
import { Box as Box4, Text as Text4, useInput, useStdin } from "ink";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function maskValue(value, mask) {
  if (!mask) {
    return value;
  }
  return "\u2022".repeat(value.length);
}
function Prompt({
  label,
  hint,
  initialValue = "",
  mask,
  allowEmpty = false,
  validate,
  onSubmit
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { isRawModeSupported } = useStdin();
  async function handleSubmit() {
    if (busy) {
      return;
    }
    const trimmed = value.trim();
    if (!allowEmpty && trimmed.length === 0) {
      setError("Value is required");
      return;
    }
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setBusy(true);
    try {
      const result = await onSubmit(value);
      if (typeof result === "string" && result.length > 0) {
        setError(result);
        setBusy(false);
        return;
      }
      setError(null);
    } finally {
      setBusy(false);
    }
  }
  useInput((input, key) => {
    if (busy || !isRawModeSupported) {
      return;
    }
    if (key.ctrl && input === "c") {
      return;
    }
    if (key.return) {
      void handleSubmit();
      return;
    }
    if (key.backspace || key.delete) {
      setValue((current) => current.slice(0, -1));
      setError(null);
      return;
    }
    if (key.escape) {
      setValue("");
      setError(null);
      return;
    }
    if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
      return;
    }
    if (input) {
      setValue((current) => current + input);
      setError(null);
    }
  }, { isActive: isRawModeSupported && !busy });
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx4(Text4, { children: label }),
    isRawModeSupported ? /* @__PURE__ */ jsxs4(Text4, { children: [
      maskValue(value, mask),
      value.length === 0 && !mask ? "\u2581" : ""
    ] }) : /* @__PURE__ */ jsx4(Text4, { color: "red", children: "Interactive input is not supported in this environment. Supply values via CLI flags." }),
    hint ? /* @__PURE__ */ jsx4(Text4, { color: "gray", children: hint }) : null,
    error ? /* @__PURE__ */ jsx4(Text4, { color: "red", children: error }) : null
  ] });
}

// src/components/keyset/ShareSaver.tsx
import { useMemo, useState as useState2 } from "react";
import { Box as Box5, Text as Text5 } from "ink";
import { decodeShare } from "@frostr/igloo-core";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function ShareSaver({
  keysetName,
  groupCredential,
  shareCredentials,
  onComplete,
  autoPassword,
  outputDir
}) {
  const [currentIndex, setCurrentIndex] = useState2(0);
  const [phase, setPhase] = useState2("password");
  const [passwordDraft, setPasswordDraft] = useState2("");
  const [savedPaths, setSavedPaths] = useState2([]);
  const [skipped, setSkipped] = useState2([]);
  const [feedback, setFeedback] = useState2(null);
  const [notified, setNotified] = useState2(false);
  const [autoState, setAutoState] = useState2("idle");
  const [autoError, setAutoError] = useState2(null);
  const shares = useMemo(() => {
    return shareCredentials.map((credential, idx) => {
      try {
        const decoded = decodeShare(credential);
        return {
          credential,
          index: decoded.idx ?? idx + 1
        };
      } catch (error) {
        return {
          credential,
          index: idx + 1
        };
      }
    });
  }, [shareCredentials]);
  const share = shares[currentIndex];
  const isAutomated = typeof autoPassword === "string" && autoPassword.length > 0;
  const summaryView = /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "All shares processed." }),
    /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "Group credential:" }),
    /* @__PURE__ */ jsx5(Text5, { color: "gray", children: groupCredential }),
    savedPaths.length > 0 ? /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", marginTop: 1, children: [
      /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "Saved files" }),
      savedPaths.map((path5) => /* @__PURE__ */ jsx5(Text5, { color: "gray", children: path5 }, path5))
    ] }) : /* @__PURE__ */ jsx5(Text5, { color: "yellow", children: "No shares were persisted." }),
    skipped.length > 0 ? /* @__PURE__ */ jsxs5(Text5, { color: "yellow", children: [
      "Skipped shares: ",
      skipped.join(", ")
    ] }) : null,
    /* @__PURE__ */ jsx5(Box5, { marginTop: 1, children: /* @__PURE__ */ jsx5(Text5, { color: "gray", children: "Run `igloo-cli keyset list` to review your saved shares later." }) })
  ] });
  if (!share) {
    if (!notified && onComplete) {
      onComplete({ savedPaths, skipped });
      setNotified(true);
    }
    return summaryView;
  }
  function resetForNext(nextIndex) {
    setCurrentIndex(nextIndex);
    setPhase("password");
    setPasswordDraft("");
    setFeedback(null);
  }
  const handleSaveInternal = async (password) => {
    const salt = randomSaltHex();
    const secret = deriveSecret(password, salt);
    const { cipherText } = encryptPayload(secret, share.credential);
    const record = {
      id: buildShareId(keysetName, share.index),
      name: `${keysetName} share ${share.index}`,
      keysetName,
      index: share.index,
      share: cipherText,
      salt,
      groupCredential,
      savedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return saveShareRecord(record, { directory: outputDir });
  };
  async function handleSave(password) {
    setPhase("saving");
    try {
      const filepath = await handleSaveInternal(password);
      setSavedPaths((current) => [...current, filepath]);
      setFeedback(`Share ${share.index} encrypted and saved.`);
      setPhase("done");
    } catch (error) {
      setFeedback(`Failed to save share: ${error?.message ?? error}`);
      setPhase("password");
      setPasswordDraft("");
    }
  }
  function handlePasswordSubmit(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setSkipped((current) => [...current, share.index]);
      resetForNext(currentIndex + 1);
      return void 0;
    }
    if (trimmed.length < 8) {
      setFeedback("Password must be at least 8 characters.");
      return "Password must be at least 8 characters.";
    }
    setPasswordDraft(trimmed);
    setPhase("confirm");
    return void 0;
  }
  function handleConfirmSubmit(value) {
    if (value !== passwordDraft) {
      setFeedback("Passwords do not match. Try again.");
      setPasswordDraft("");
      setPhase("password");
      return "Passwords do not match. Try again.";
    }
    void handleSave(passwordDraft);
    return void 0;
  }
  if (isAutomated) {
    if (autoState === "idle") {
      if (!autoPassword || autoPassword.length < 8) {
        setAutoError("Automation password must be at least 8 characters.");
        setAutoState("error");
      } else {
        setAutoState("running");
        void (async () => {
          try {
            const paths = [];
            for (const candidate of shares) {
              const salt = randomSaltHex();
              const secret = deriveSecret(autoPassword, salt);
              const { cipherText } = encryptPayload(secret, candidate.credential);
              const record = {
                id: buildShareId(keysetName, candidate.index),
                name: `${keysetName} share ${candidate.index}`,
                keysetName,
                index: candidate.index,
                share: cipherText,
                salt,
                groupCredential,
                savedAt: (/* @__PURE__ */ new Date()).toISOString()
              };
              const filepath = await saveShareRecord(record, { directory: outputDir });
              paths.push(filepath);
            }
            setSavedPaths(paths);
            setAutoState("done");
            if (onComplete) {
              onComplete({ savedPaths: paths, skipped: [] });
            }
          } catch (error) {
            setAutoError(error?.message ?? "Failed to save shares in automated mode.");
            setAutoState("error");
          }
        })();
      }
    }
    if (autoState === "running") {
      return /* @__PURE__ */ jsx5(Box5, { flexDirection: "column", children: /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "Encrypting and saving shares\u2026" }) });
    }
    if (autoState === "error") {
      return /* @__PURE__ */ jsx5(Box5, { flexDirection: "column", children: /* @__PURE__ */ jsx5(Text5, { color: "red", children: autoError ?? "Automation failed." }) });
    }
    return summaryView;
  }
  if (phase === "saving") {
    return /* @__PURE__ */ jsx5(Box5, { flexDirection: "column", children: /* @__PURE__ */ jsxs5(Text5, { color: "cyan", children: [
      "Encrypting share ",
      share.index,
      "\u2026"
    ] }) });
  }
  if (phase === "done") {
    return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs5(Text5, { color: "green", children: [
        "Share ",
        share.index,
        " saved."
      ] }),
      feedback ? /* @__PURE__ */ jsx5(Text5, { color: "gray", children: feedback }) : null,
      /* @__PURE__ */ jsx5(
        Prompt,
        {
          label: "Press Enter to continue",
          allowEmpty: true,
          onSubmit: () => {
            resetForNext(currentIndex + 1);
            return void 0;
          }
        },
        `continue-${share.index}`
      )
    ] });
  }
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", children: [
    /* @__PURE__ */ jsxs5(Text5, { color: "cyan", children: [
      "Share ",
      share.index,
      " of ",
      shareCredentials.length
    ] }),
    /* @__PURE__ */ jsx5(Text5, { color: "gray", children: share.credential }),
    /* @__PURE__ */ jsx5(Text5, { children: "Set a password to encrypt this share. Leave blank to skip saving and handle it manually." }),
    feedback ? /* @__PURE__ */ jsx5(Text5, { color: "yellow", children: feedback }) : null,
    phase === "password" ? /* @__PURE__ */ jsx5(
      Prompt,
      {
        label: "Password (blank to skip)",
        mask: true,
        allowEmpty: true,
        onSubmit: handlePasswordSubmit
      },
      `password-${share.index}`
    ) : null,
    phase === "confirm" ? /* @__PURE__ */ jsx5(
      Prompt,
      {
        label: "Confirm password",
        mask: true,
        onSubmit: handleConfirmSubmit
      },
      `confirm-${share.index}`
    ) : null
  ] });
}

// src/components/keyset/KeysetCreate.tsx
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function parseNumberFlag(value, fallback) {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}
function generateKeyMaterial() {
  const secretBuffer = randomBytes2(32);
  const secretBytes = Uint8Array.from(secretBuffer);
  const secretHex = Buffer.from(secretBytes).toString("hex");
  const publicKey = ed25519.getPublicKey(secretBytes);
  const publicKeyHex = Buffer.from(publicKey).toString("hex");
  const npub = nip19.npubEncode(publicKeyHex);
  const nsec = nip19.nsecEncode(secretBytes);
  return {
    secretHex,
    npub,
    nsec
  };
}
function decodeSecret(input) {
  const trimmed = input.trim();
  if (trimmed.toLowerCase() === "generate") {
    return generateKeyMaterial();
  }
  if (trimmed.startsWith("nsec")) {
    try {
      const decoded = nip19.decode(trimmed);
      if (decoded.type !== "nsec") {
        return "Provided value is not an nsec secret key.";
      }
      const secretBytes = Uint8Array.from(decoded.data);
      const secretHex = Buffer.from(secretBytes).toString("hex");
      if (secretHex.length !== 64) {
        return "Secret key must be 32 bytes.";
      }
      const publicKey = ed25519.getPublicKey(secretBytes);
      const publicKeyHex = Buffer.from(publicKey).toString("hex");
      const npub = nip19.npubEncode(publicKeyHex);
      return {
        secretHex,
        nsec: trimmed,
        npub
      };
    } catch (error) {
      return `Failed to decode nsec: ${error.message ?? error}`;
    }
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    const secretHex = trimmed.toLowerCase();
    const secretBytes = Uint8Array.from(Buffer.from(secretHex, "hex"));
    const publicKey = ed25519.getPublicKey(secretBytes);
    const publicKeyHex = Buffer.from(publicKey).toString("hex");
    const npub = nip19.npubEncode(publicKeyHex);
    const nsec = nip19.nsecEncode(secretBytes);
    return {
      secretHex,
      nsec,
      npub
    };
  }
  return 'Enter an nsec (bech32) secret key or 64-character hex string, or type "generate".';
}
function KeysetCreate({ flags: flags2 }) {
  const [sharesState, setSharesState] = useState3({
    loading: true,
    error: null,
    data: []
  });
  const [form, setForm] = useState3({
    name: typeof flags2.name === "string" ? flags2.name : "",
    threshold: parseNumberFlag(flags2.threshold, 2),
    total: parseNumberFlag(flags2.total, 3)
  });
  const [validated, setValidated] = useState3({
    name: false,
    threshold: false,
    total: false,
    nsec: false
  });
  const [keyMaterial, setKeyMaterial] = useState3(null);
  const [keyset, setKeyset] = useState3(null);
  const [generationStatus, setGenerationStatus] = useState3("idle");
  const [generationError, setGenerationError] = useState3(null);
  const [prefilled, setPrefilled] = useState3(false);
  const directPassword = typeof flags2.password === "string" ? flags2.password : void 0;
  const passwordFilePath = typeof flags2["password-file"] === "string" ? flags2["password-file"] : void 0;
  const outputDirFlag = typeof flags2.output === "string" ? flags2.output : void 0;
  const resolvedOutputDir = outputDirFlag ? path4.resolve(process.cwd(), outputDirFlag) : void 0;
  const [automationPassword, setAutomationPassword] = useState3(directPassword);
  const [automationError, setAutomationError] = useState3(null);
  const [automationLoading, setAutomationLoading] = useState3(Boolean(passwordFilePath && !directPassword));
  const automationRequested = Boolean(directPassword || passwordFilePath || outputDirFlag);
  useEffect(() => {
    void (async () => {
      try {
        const data = await readShareFiles();
        setSharesState({ loading: false, error: null, data });
      } catch (error) {
        setSharesState({
          loading: false,
          error: error?.message ?? "Unable to load saved shares",
          data: []
        });
      }
    })();
  }, []);
  useEffect(() => {
    if (directPassword) {
      setAutomationPassword(directPassword);
      setAutomationLoading(false);
      return;
    }
    if (!passwordFilePath) {
      setAutomationLoading(false);
      return;
    }
    setAutomationLoading(true);
    setAutomationError(null);
    void (async () => {
      try {
        const raw = await fs3.readFile(passwordFilePath, "utf8");
        const firstLine = raw.split(/\r?\n/)[0] ?? "";
        const trimmed = firstLine.trim();
        setAutomationPassword(trimmed.length > 0 ? trimmed : void 0);
        setAutomationLoading(false);
      } catch (error) {
        setAutomationError(`Unable to read password file: ${error?.message ?? error}`);
        setAutomationLoading(false);
      }
    })();
  }, [directPassword, passwordFilePath]);
  const existingSlugs = useMemo2(() => {
    return new Set(
      sharesState.data.map((record) => {
        if (record.keysetName) {
          return slugifyKeysetName(record.keysetName);
        }
        const match = record.name.match(/(.+) share \d+$/i);
        const base = match ? match[1] : record.name;
        return slugifyKeysetName(base);
      })
    );
  }, [sharesState.data]);
  const thresholdFlagProvided = typeof flags2.threshold === "string" || typeof flags2.threshold === "boolean" && flags2.threshold;
  const totalFlagProvided = typeof flags2.total === "string" || typeof flags2.total === "boolean" && flags2.total;
  useEffect(() => {
    if (sharesState.loading || prefilled) {
      return;
    }
    const nextValidated = { ...validated };
    let changed = false;
    if (!nextValidated.name && form.name.trim().length > 0) {
      const slug = slugifyKeysetName(form.name);
      if (!existingSlugs.has(slug)) {
        nextValidated.name = true;
        changed = true;
      }
    }
    const shouldPrefillTotal = automationRequested || totalFlagProvided;
    if (!nextValidated.total && shouldPrefillTotal && form.total >= form.threshold) {
      nextValidated.total = true;
      changed = true;
    }
    const shouldPrefillThreshold = automationRequested || thresholdFlagProvided;
    if (!nextValidated.threshold && shouldPrefillThreshold && form.threshold > 0) {
      nextValidated.threshold = true;
      changed = true;
    }
    const nsecFlag = typeof flags2.nsec === "string" ? flags2.nsec : void 0;
    if (!nextValidated.nsec && nsecFlag) {
      const decoded = decodeSecret(nsecFlag);
      if (typeof decoded !== "string") {
        setKeyMaterial(decoded);
        nextValidated.nsec = true;
        changed = true;
      }
    }
    if (changed) {
      setValidated(nextValidated);
    }
    setPrefilled(true);
  }, [
    sharesState.loading,
    prefilled,
    form.name,
    form.threshold,
    form.total,
    existingSlugs,
    flags2.nsec,
    validated,
    automationRequested,
    thresholdFlagProvided,
    totalFlagProvided
  ]);
  useEffect(() => {
    if (generationStatus !== "idle" || keyset !== null) {
      return;
    }
    if (!validated.name || !validated.threshold || !validated.total || !validated.nsec) {
      return;
    }
    if (!keyMaterial) {
      return;
    }
    setGenerationStatus("pending");
    setGenerationError(null);
    try {
      const generated = generateKeysetWithSecret(form.threshold, form.total, keyMaterial.secretHex);
      setKeyset(generated);
      setGenerationStatus("ready");
    } catch (error) {
      setGenerationStatus("error");
      setGenerationError(error?.message ?? "Failed to generate keyset");
    }
  }, [validated, keyMaterial, form.threshold, form.total, generationStatus, keyset]);
  if (sharesState.loading) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "cyan", children: "Loading existing shares\u2026" }) });
  }
  if (sharesState.error) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "red", children: sharesState.error }) });
  }
  if (automationError) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "red", children: automationError }) });
  }
  if (automationRequested && !prefilled) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "cyan", children: "Preparing automation inputs\u2026" }) });
  }
  const currentStep = (() => {
    if (!validated.name) {
      return "name";
    }
    if (!validated.total) {
      return "total";
    }
    if (!validated.threshold) {
      return "threshold";
    }
    if (!validated.nsec) {
      return "nsec";
    }
    return void 0;
  })();
  if (currentStep === "name") {
    return /* @__PURE__ */ jsx6(
      Prompt,
      {
        label: "Keyset name",
        initialValue: form.name,
        hint: "Choose a unique name.",
        onSubmit: async (value) => {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            return "Keyset name cannot be empty.";
          }
          if (await keysetNameExists(trimmed) || existingSlugs.has(slugifyKeysetName(trimmed))) {
            return "A keyset with this name already exists in your share directory.";
          }
          setForm((current) => ({ ...current, name: trimmed }));
          setValidated((current) => ({ ...current, name: true }));
          return void 0;
        }
      },
      "keyset-name"
    );
  }
  if (currentStep === "total") {
    return /* @__PURE__ */ jsx6(
      Prompt,
      {
        label: "Total number of shares",
        initialValue: String(form.total),
        hint: "Must be an integer between 1 and 16.",
        onSubmit: (value) => {
          const numeric = Number(value.trim());
          if (!Number.isInteger(numeric) || numeric < 1) {
            return "Total shares must be an integer greater than 0.";
          }
          if (numeric > 16) {
            return "Total shares is capped at 16 for now.";
          }
          const wasThresholdValidated = validated.threshold;
          if (wasThresholdValidated && numeric < form.threshold) {
            return "Total shares cannot be smaller than the threshold.";
          }
          const shouldClampThreshold = !wasThresholdValidated && form.threshold > numeric;
          setForm((current) => {
            const nextThreshold = shouldClampThreshold ? Math.min(current.threshold, numeric) : current.threshold;
            return { ...current, total: numeric, threshold: nextThreshold };
          });
          setValidated((current) => ({
            ...current,
            total: true,
            threshold: wasThresholdValidated ? current.threshold : false
          }));
          return void 0;
        }
      },
      "total"
    );
  }
  if (currentStep === "threshold") {
    return /* @__PURE__ */ jsx6(
      Prompt,
      {
        label: "Threshold (number of shares required)",
        initialValue: String(form.threshold),
        hint: "Must be at least 1 and not greater than total shares.",
        onSubmit: (value) => {
          const numeric = Number(value.trim());
          if (!Number.isInteger(numeric) || numeric < 1) {
            return "Threshold must be an integer greater than 0.";
          }
          if (numeric > form.total) {
            return "Threshold cannot exceed total number of shares.";
          }
          setForm((current) => ({ ...current, threshold: numeric }));
          setValidated((current) => ({ ...current, threshold: true }));
          return void 0;
        }
      },
      "threshold"
    );
  }
  if (currentStep === "nsec") {
    return /* @__PURE__ */ jsx6(
      Prompt,
      {
        label: "Secret key",
        hint: "Paste an nsec, 64-char hex key, or type 'generate' to create a fresh one.",
        onSubmit: (value) => {
          const decoded = decodeSecret(value);
          if (typeof decoded === "string") {
            return decoded;
          }
          setKeyMaterial(decoded);
          setValidated((current) => ({ ...current, nsec: true }));
          return void 0;
        }
      },
      "nsec"
    );
  }
  if (generationStatus === "pending") {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "cyan", children: "Generating keyset\u2026" }) });
  }
  if (generationStatus === "error" || generationError) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "red", children: generationError ?? "Failed to generate keyset." }) });
  }
  if (!keyset || !keyMaterial) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "cyan", children: "Preparing key material\u2026" }) });
  }
  if (automationLoading) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "cyan", children: "Preparing automation inputs\u2026" }) });
  }
  if (automationPassword && automationPassword.length > 0 && automationPassword.length < 8) {
    return /* @__PURE__ */ jsx6(Box6, { flexDirection: "column", children: /* @__PURE__ */ jsx6(Text6, { color: "red", children: "Automation password must be at least 8 characters." }) });
  }
  return /* @__PURE__ */ jsxs6(Box6, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx6(Text6, { color: "cyanBright", children: "Keyset ready" }),
    /* @__PURE__ */ jsxs6(Text6, { children: [
      "Name: ",
      form.name
    ] }),
    /* @__PURE__ */ jsxs6(Text6, { children: [
      "Threshold: ",
      form.threshold
    ] }),
    /* @__PURE__ */ jsxs6(Text6, { children: [
      "Total shares: ",
      form.total
    ] }),
    /* @__PURE__ */ jsxs6(Text6, { children: [
      "npub: ",
      keyMaterial.npub
    ] }),
    /* @__PURE__ */ jsxs6(Text6, { children: [
      "nsec: ",
      keyMaterial.nsec
    ] }),
    resolvedOutputDir ? /* @__PURE__ */ jsxs6(Text6, { color: "gray", children: [
      "Output directory: ",
      resolvedOutputDir
    ] }) : null,
    /* @__PURE__ */ jsx6(Box6, { marginTop: 1, flexDirection: "column", children: /* @__PURE__ */ jsx6(
      ShareSaver,
      {
        keysetName: form.name,
        groupCredential: keyset.groupCredential,
        shareCredentials: keyset.shareCredentials,
        onComplete: () => {
          setGenerationStatus("ready");
        },
        autoPassword: automationPassword,
        outputDir: resolvedOutputDir
      }
    ) })
  ] });
}

// src/components/keyset/KeysetList.tsx
import { useEffect as useEffect2, useState as useState4 } from "react";
import { Box as Box7, Text as Text7 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function KeysetList() {
  const [state, setState] = useState4({
    loading: true,
    error: null,
    shareDir: null,
    shares: []
  });
  useEffect2(() => {
    void (async () => {
      try {
        const [dir, entries] = await Promise.all([
          ensureShareDirectory(),
          readShareFiles()
        ]);
        setState({ loading: false, error: null, shareDir: dir, shares: entries });
      } catch (error) {
        setState({
          loading: false,
          error: error?.message ?? "Failed to read share directory.",
          shareDir: null,
          shares: []
        });
      }
    })();
  }, []);
  if (state.loading) {
    return /* @__PURE__ */ jsx7(Box7, { flexDirection: "column", children: /* @__PURE__ */ jsx7(Text7, { color: "cyan", children: "Scanning saved shares\u2026" }) });
  }
  if (state.error) {
    return /* @__PURE__ */ jsx7(Box7, { flexDirection: "column", children: /* @__PURE__ */ jsx7(Text7, { color: "red", children: state.error }) });
  }
  if (state.shares.length === 0) {
    return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx7(Text7, { color: "yellow", children: "No saved shares found yet." }),
      state.shareDir ? /* @__PURE__ */ jsxs7(Text7, { color: "gray", children: [
        "Share directory: ",
        state.shareDir
      ] }) : null
    ] });
  }
  return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx7(Text7, { color: "cyanBright", children: "Saved shares" }),
    state.shareDir ? /* @__PURE__ */ jsxs7(Text7, { color: "gray", children: [
      "Directory: ",
      state.shareDir
    ] }) : null,
    /* @__PURE__ */ jsx7(Box7, { flexDirection: "column", marginTop: 1, children: state.shares.map((share, index) => /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsxs7(Text7, { children: [
        index + 1,
        ". ",
        share.name,
        " (",
        share.id,
        ")"
      ] }),
      /* @__PURE__ */ jsxs7(Text7, { color: "gray", children: [
        "Saved at: ",
        share.savedAt
      ] }),
      /* @__PURE__ */ jsxs7(Text7, { color: "gray", children: [
        "File: ",
        share.filepath
      ] })
    ] }, share.id)) })
  ] });
}

// src/components/keyset/KeysetLoad.tsx
import { useEffect as useEffect3, useMemo as useMemo3, useState as useState5 } from "react";
import { Box as Box8, Text as Text8 } from "ink";
import { decodeGroup, decodeShare as decodeShare2 } from "@frostr/igloo-core";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function KeysetLoad({ args: args2 }) {
  const [state, setState] = useState5({ loading: true, error: null, shares: [] });
  const [phase, setPhase] = useState5("select");
  const [selectedShare, setSelectedShare] = useState5(null);
  const [result, setResult] = useState5(null);
  useEffect3(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setState({ loading: false, error: null, shares });
      } catch (error) {
        setState({ loading: false, error: error?.message ?? "Failed to read shares.", shares: [] });
      }
    })();
  }, []);
  const attemptPreselect = useMemo3(() => {
    if (state.shares.length === 0 || args2.length === 0) {
      return null;
    }
    const token = args2[0];
    const byId = state.shares.find((share) => share.id === token || share.name === token);
    if (byId) {
      return byId;
    }
    const numeric = Number(token);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= state.shares.length) {
      return state.shares[numeric - 1];
    }
    return null;
  }, [state.shares, args2]);
  useEffect3(() => {
    if (attemptPreselect && !selectedShare) {
      setSelectedShare(attemptPreselect);
      setPhase("password");
    }
  }, [attemptPreselect, selectedShare]);
  if (state.loading) {
    return /* @__PURE__ */ jsx8(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "Loading saved shares\u2026" }) });
  }
  if (state.error) {
    return /* @__PURE__ */ jsx8(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx8(Text8, { color: "red", children: state.error }) });
  }
  if (state.shares.length === 0) {
    return /* @__PURE__ */ jsx8(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx8(Text8, { color: "yellow", children: "No saved shares available." }) });
  }
  if (phase === "select") {
    return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx8(Text8, { color: "cyanBright", children: "Select a share to load" }),
      state.shares.map((share, index) => /* @__PURE__ */ jsxs8(Text8, { children: [
        index + 1,
        ". ",
        share.name,
        " (",
        share.id,
        ")"
      ] }, share.id)),
      /* @__PURE__ */ jsx8(
        Prompt,
        {
          label: "Enter number or share id",
          onSubmit: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return "Please choose a share (or press Ctrl+C to exit).";
            }
            const byId = state.shares.find((share) => share.id === trimmed || share.name === trimmed);
            if (byId) {
              setSelectedShare(byId);
              setPhase("password");
              return void 0;
            }
            const numeric = Number(trimmed);
            if (Number.isInteger(numeric) && numeric >= 1 && numeric <= state.shares.length) {
              setSelectedShare(state.shares[numeric - 1]);
              setPhase("password");
              return void 0;
            }
            return "Share not found. Enter a listed number or id.";
          }
        },
        "select-share"
      )
    ] });
  }
  if (!selectedShare) {
    return /* @__PURE__ */ jsx8(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx8(Text8, { color: "red", children: "Share selection missing." }) });
  }
  if (phase === "password") {
    return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs8(Text8, { color: "cyanBright", children: [
        "Decrypt share: ",
        selectedShare.name
      ] }),
      /* @__PURE__ */ jsxs8(Text8, { color: "gray", children: [
        "Saved at ",
        selectedShare.savedAt
      ] }),
      /* @__PURE__ */ jsx8(
        Prompt,
        {
          label: "Enter password",
          mask: true,
          onSubmit: (value) => {
            if (value.length < 8) {
              return "Password must be at least 8 characters.";
            }
            try {
              const secret = deriveSecret(value, selectedShare.salt);
              const plaintext = decryptPayload(secret, selectedShare.share);
              setResult({ share: plaintext, group: selectedShare.groupCredential });
              setPhase("result");
              return void 0;
            } catch (error) {
              return error?.message ?? "Failed to decrypt share. Check your password.";
            }
          }
        },
        `password-${selectedShare.id}`
      )
    ] });
  }
  if (!result) {
    return /* @__PURE__ */ jsx8(Box8, { flexDirection: "column", children: /* @__PURE__ */ jsx8(Text8, { color: "red", children: "Failed to decrypt share." }) });
  }
  let shareIndex;
  try {
    const decodedShare = decodeShare2(result.share);
    shareIndex = decodedShare.idx;
  } catch {
    shareIndex = void 0;
  }
  let groupInfo;
  try {
    const decodedGroup = decodeGroup(result.group);
    groupInfo = {
      threshold: decodedGroup.threshold,
      totalMembers: decodedGroup.total_members ?? decodedGroup.totalMembers
    };
  } catch {
    groupInfo = void 0;
  }
  return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx8(Text8, { color: "green", children: "Share decrypted successfully." }),
    /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "Share credential" }),
    /* @__PURE__ */ jsx8(Text8, { color: "gray", children: result.share }),
    /* @__PURE__ */ jsx8(Box8, { marginTop: 1, children: /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "Group credential" }) }),
    /* @__PURE__ */ jsx8(Text8, { color: "gray", children: result.group }),
    shareIndex !== void 0 ? /* @__PURE__ */ jsxs8(Box8, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "Share details" }),
      /* @__PURE__ */ jsxs8(Text8, { color: "gray", children: [
        "Index: ",
        shareIndex
      ] })
    ] }) : null,
    groupInfo ? /* @__PURE__ */ jsxs8(Box8, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "Group details" }),
      groupInfo.threshold !== void 0 ? /* @__PURE__ */ jsxs8(Text8, { color: "gray", children: [
        "Threshold: ",
        groupInfo.threshold
      ] }) : null,
      groupInfo.totalMembers !== void 0 ? /* @__PURE__ */ jsxs8(Text8, { color: "gray", children: [
        "Total members: ",
        groupInfo.totalMembers
      ] }) : null
    ] }) : null
  ] });
}

// src/components/keyset/KeysetHelp.tsx
import { Box as Box9, Text as Text9 } from "ink";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
function KeysetHelp() {
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", children: [
    /* @__PURE__ */ jsx9(Text9, { color: "cyanBright", children: "Keyset commands" }),
    /* @__PURE__ */ jsx9(Text9, { children: "- igloo-cli keyset create   Interactive keyset and share generator." }),
    /* @__PURE__ */ jsx9(Text9, { children: "- igloo-cli keyset list     Show saved shares on this machine." }),
    /* @__PURE__ */ jsx9(Text9, { children: "- igloo-cli keyset load     Decrypt a saved share for export." }),
    /* @__PURE__ */ jsx9(Text9, { children: "- igloo-cli keyset status   Ping peers for a saved share." }),
    /* @__PURE__ */ jsx9(Box9, { marginTop: 1, children: /* @__PURE__ */ jsx9(Text9, { color: "gray", children: 'Example: igloo-cli keyset create --name "Vault" --threshold 2 --total 3' }) }),
    /* @__PURE__ */ jsx9(Box9, { children: /* @__PURE__ */ jsx9(Text9, { color: "gray", children: "Automation: --password-file ./pass.txt --output ./shares --share my-share" }) })
  ] });
}

// src/components/keyset/KeysetStatus.tsx
import { useEffect as useEffect4, useMemo as useMemo4, useState as useState6 } from "react";
import { Box as Box10, Text as Text10 } from "ink";
import fs4 from "fs/promises";
import {
  createAndConnectNode,
  closeNode,
  checkPeerStatus,
  DEFAULT_PING_RELAYS
} from "@frostr/igloo-core";
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
function parseRelayFlags(flags2) {
  const relayString = typeof flags2.relays === "string" ? flags2.relays : typeof flags2.relay === "string" ? flags2.relay : void 0;
  if (!relayString) {
    return void 0;
  }
  return relayString.split(",").map((relay) => relay.trim()).filter(Boolean);
}
function findShare(shares, token) {
  if (!token) {
    return null;
  }
  const direct = shares.find((share) => share.id === token || share.name === token);
  if (direct) {
    return direct;
  }
  const numeric = Number(token);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= shares.length) {
    return shares[numeric - 1];
  }
  return null;
}
function KeysetStatus({ flags: flags2, args: args2 }) {
  const [state, setState] = useState6({ loading: true, error: null, shares: [] });
  const [phase, setPhase] = useState6("select");
  const [selectedShare, setSelectedShare] = useState6(null);
  const [result, setResult] = useState6(null);
  const [statusError, setStatusError] = useState6(null);
  const [autoRan, setAutoRan] = useState6(false);
  const directPassword = typeof flags2.password === "string" ? flags2.password : void 0;
  const passwordFilePath = typeof flags2["password-file"] === "string" ? flags2["password-file"] : void 0;
  const [automationPassword, setAutomationPassword] = useState6(directPassword);
  const [automationError, setAutomationError] = useState6(null);
  const [automationLoading, setAutomationLoading] = useState6(Boolean(passwordFilePath && !directPassword));
  const shareToken = typeof flags2.share === "string" ? flags2.share : args2[0];
  const relayOverrides = parseRelayFlags(flags2);
  const relays = relayOverrides && relayOverrides.length > 0 ? relayOverrides : DEFAULT_PING_RELAYS;
  useEffect4(() => {
    void (async () => {
      try {
        const shares = await readShareFiles();
        setState({ loading: false, error: null, shares });
      } catch (error) {
        setState({
          loading: false,
          error: error?.message ?? "Failed to load saved shares.",
          shares: []
        });
      }
    })();
  }, []);
  useEffect4(() => {
    if (directPassword) {
      setAutomationPassword(directPassword);
      setAutomationLoading(false);
      return;
    }
    if (!passwordFilePath) {
      setAutomationLoading(false);
      return;
    }
    setAutomationLoading(true);
    setAutomationError(null);
    void (async () => {
      try {
        const raw = await fs4.readFile(passwordFilePath, "utf8");
        const firstLine = raw.split(/\r?\n/)[0] ?? "";
        const trimmed = firstLine.trim();
        setAutomationPassword(trimmed.length > 0 ? trimmed : void 0);
        setAutomationLoading(false);
      } catch (error) {
        setAutomationError(`Unable to read password file: ${error?.message ?? error}`);
        setAutomationLoading(false);
      }
    })();
  }, [directPassword, passwordFilePath]);
  const preselectedShare = useMemo4(() => {
    if (state.shares.length === 0) {
      return null;
    }
    return findShare(state.shares, shareToken ?? void 0);
  }, [state.shares, shareToken]);
  useEffect4(() => {
    if (preselectedShare && !selectedShare) {
      setSelectedShare(preselectedShare);
      setPhase((prev) => prev === "select" ? "password" : prev);
    }
  }, [preselectedShare, selectedShare]);
  useEffect4(() => {
    if (!automationPassword || automationPassword.length === 0) {
      return;
    }
    if (automationPassword.length < 8) {
      setAutomationError("Automation password must be at least 8 characters.");
      return;
    }
  }, [automationPassword]);
  const isAutomated = Boolean(automationPassword && shareToken);
  const autoReady = isAutomated && !automationLoading && !automationError && !autoRan && selectedShare !== null && automationPassword !== void 0 && automationPassword.length >= 8;
  useEffect4(() => {
    if (!autoReady) {
      return;
    }
    setAutoRan(true);
    void startDiagnostics(automationPassword, selectedShare);
  }, [autoReady, automationPassword, selectedShare]);
  async function startDiagnostics(password, share) {
    setPhase("diagnosing");
    setStatusError(null);
    setResult(null);
    let node;
    try {
      const secret = deriveSecret(password, share.salt);
      const shareCredential = decryptPayload(secret, share.share);
      node = await createAndConnectNode(
        {
          group: share.groupCredential,
          share: shareCredential,
          relays
        },
        { enableLogging: false }
      );
      const peers = await checkPeerStatus(node, share.groupCredential, shareCredential);
      setResult({ relays, peers });
      setPhase("result");
    } catch (error) {
      setStatusError(error?.message ?? "Failed to collect peer status.");
      setPhase("result");
    } finally {
      if (node) {
        try {
          closeNode(node);
        } catch (closeError) {
        }
      }
    }
  }
  if (state.loading || automationLoading) {
    return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "cyan", children: "Loading saved shares\u2026" }) });
  }
  if (state.error) {
    return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "red", children: state.error }) });
  }
  if (automationError) {
    return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "red", children: automationError }) });
  }
  if (state.shares.length === 0) {
    return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "yellow", children: "No saved shares available." }) });
  }
  if (phase === "select") {
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx10(Text10, { color: "cyanBright", children: "Select a share to diagnose" }),
      state.shares.map((share, index) => /* @__PURE__ */ jsxs10(Text10, { children: [
        index + 1,
        ". ",
        share.name,
        " (",
        share.id,
        ")"
      ] }, share.id)),
      /* @__PURE__ */ jsx10(
        Prompt,
        {
          label: "Enter number or share id",
          onSubmit: (value) => {
            const trimmed = value.trim();
            if (trimmed.length === 0) {
              return "Please choose a share (or press Ctrl+C to exit).";
            }
            const chosen = findShare(state.shares, trimmed);
            if (!chosen) {
              return "Share not found. Enter a listed number or id.";
            }
            setSelectedShare(chosen);
            setPhase("password");
            return void 0;
          }
        },
        "select-share"
      )
    ] });
  }
  if (!selectedShare) {
    return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "red", children: "Share selection missing." }) });
  }
  if (!isAutomated && phase === "password") {
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsxs10(Text10, { color: "cyanBright", children: [
        "Decrypt share: ",
        selectedShare.name
      ] }),
      /* @__PURE__ */ jsxs10(Text10, { color: "gray", children: [
        "Saved at ",
        selectedShare.savedAt
      ] }),
      /* @__PURE__ */ jsx10(
        Prompt,
        {
          label: "Enter password",
          mask: true,
          onSubmit: (value) => {
            if (value.length < 8) {
              return "Password must be at least 8 characters.";
            }
            setAutomationPassword(value);
            void startDiagnostics(value, selectedShare);
            return void 0;
          }
        },
        `password-${selectedShare.id}`
      )
    ] });
  }
  if (phase === "diagnosing") {
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx10(Text10, { color: "cyan", children: "Checking peer status via relays\u2026" }),
      /* @__PURE__ */ jsxs10(Text10, { color: "gray", children: [
        "Relays: ",
        relays.join(", ")
      ] })
    ] });
  }
  if (phase === "result") {
    if (statusError) {
      return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "red", children: statusError }) });
    }
    if (!result) {
      return /* @__PURE__ */ jsx10(Box10, { flexDirection: "column", children: /* @__PURE__ */ jsx10(Text10, { color: "red", children: "No diagnostics result available." }) });
    }
    return /* @__PURE__ */ jsxs10(Box10, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx10(Text10, { color: "green", children: "Peer diagnostics complete." }),
      /* @__PURE__ */ jsx10(Text10, { color: "cyan", children: "Relays" }),
      /* @__PURE__ */ jsx10(Text10, { color: "gray", children: result.relays.join(", ") }),
      /* @__PURE__ */ jsxs10(Box10, { marginTop: 1, flexDirection: "column", children: [
        /* @__PURE__ */ jsx10(Text10, { color: "cyan", children: "Peer status" }),
        result.peers.length === 0 ? /* @__PURE__ */ jsx10(Text10, { color: "yellow", children: "No peers discovered in this keyset." }) : result.peers.map((peer) => /* @__PURE__ */ jsxs10(Text10, { color: peer.status === "online" ? "green" : "red", children: [
          peer.pubkey,
          " \u2014 ",
          peer.status
        ] }, peer.pubkey))
      ] })
    ] });
  }
  return null;
}

// src/App.tsx
import { jsx as jsx11 } from "react/jsx-runtime";
function parseNumber(value, fallback) {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}
function renderKeyset(args2, flags2) {
  const subcommand = args2[0]?.toLowerCase();
  switch (subcommand) {
    case "create":
      return /* @__PURE__ */ jsx11(KeysetCreate, { flags: flags2 });
    case "list":
      return /* @__PURE__ */ jsx11(KeysetList, {});
    case "load":
      return /* @__PURE__ */ jsx11(KeysetLoad, { args: args2.slice(1) });
    case "status":
      return /* @__PURE__ */ jsx11(KeysetStatus, { flags: flags2, args: args2.slice(1) });
    case void 0:
      return /* @__PURE__ */ jsx11(KeysetHelp, {});
    default:
      return /* @__PURE__ */ jsx11(KeysetHelp, {});
  }
}
function App({ command: command2, args: args2, flags: flags2, version }) {
  const normalized = command2.toLowerCase();
  const threshold = parseNumber(flags2.threshold, 2);
  const total = parseNumber(flags2.total, 3);
  switch (normalized) {
    case "setup":
      return /* @__PURE__ */ jsx11(Setup, { threshold, total });
    case "about":
      return /* @__PURE__ */ jsx11(About, {});
    case "status":
      return /* @__PURE__ */ jsx11(KeysetStatus, { flags: flags2, args: args2 });
    case "keyset":
      return renderKeyset(args2, flags2);
    default:
      return /* @__PURE__ */ jsx11(
        Intro,
        {
          version,
          commandExamples: [
            "igloo-cli setup --threshold 2 --total 3",
            "igloo-cli about",
            "igloo-cli keyset status --share my-share --password-file ./pass.txt",
            "igloo-cli keyset create --password-file ./pass.txt --output ./shares"
          ]
        }
      );
  }
}
var App_default = App;

// src/components/Help.tsx
import { Box as Box11, Text as Text11 } from "ink";
import { jsx as jsx12, jsxs as jsxs11 } from "react/jsx-runtime";
function Help({ version }) {
  return /* @__PURE__ */ jsxs11(Box11, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsxs11(Text11, { color: "cyanBright", children: [
      "igloo-cli v",
      version
    ] }),
    /* @__PURE__ */ jsx12(Text11, { children: "Usage: igloo-cli [command] [options]" }),
    /* @__PURE__ */ jsxs11(Box11, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text11, { color: "cyan", children: "Commands" }),
      /* @__PURE__ */ jsx12(Text11, { children: "- intro (default)  Show the animated welcome." }),
      /* @__PURE__ */ jsx12(Text11, { children: "- setup            Step through signer bootstrapping." }),
      /* @__PURE__ */ jsx12(Text11, { children: "- about            Outline the FROSTR stack." }),
      /* @__PURE__ */ jsx12(Text11, { children: "- status           Check peer reachability with a saved share." }),
      /* @__PURE__ */ jsx12(Text11, { children: "- keyset           Manage keyset creation, saving, loading, status." })
    ] }),
    /* @__PURE__ */ jsxs11(Box11, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx12(Text11, { color: "cyan", children: "Options" }),
      /* @__PURE__ */ jsx12(Text11, { children: "-h, --help       Print this message." }),
      /* @__PURE__ */ jsx12(Text11, { children: "-v, --version    Print the version." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--threshold n    Override default share threshold." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--total n        Override total number of shares." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--name value     Provide a keyset name during creation." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--nsec value     Provide secret material during creation." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--password value Use a password non-interactively." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--password-file  Read password from file." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--output path    Save encrypted shares to a custom directory." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--share value    Identify which saved share to load/status." }),
      /* @__PURE__ */ jsx12(Text11, { children: "--relays list    Override relay list (comma-separated)." })
    ] })
  ] });
}

// package.json
var package_default = {
  name: "igloo-cli",
  version: "1.0.0",
  description: "Command-line companion for the FROSTR ecosystem.",
  main: "dist/cli.js",
  scripts: {
    test: "npm run typecheck",
    build: "tsup",
    dev: "tsx src/cli.tsx",
    start: "node dist/cli.js",
    typecheck: "tsc --noEmit"
  },
  repository: {
    type: "git",
    url: "git+https://github.com/FROSTR-ORG/igloo-cli.git"
  },
  keywords: [],
  author: "",
  license: "MIT",
  bugs: {
    url: "https://github.com/FROSTR-ORG/igloo-cli/issues"
  },
  homepage: "https://github.com/FROSTR-ORG/igloo-cli#readme",
  dependencies: {
    "@frostr/bifrost": "^1.0.7",
    "@frostr/igloo-core": "^0.2.0",
    "@noble/ciphers": "^2.0.1",
    "@noble/curves": "^2.0.1",
    "@noble/hashes": "^2.0.1",
    ink: "^6.3.1",
    "nostr-tools": "^2.17.0",
    react: "^19.1.1"
  },
  devDependencies: {
    "@types/node": "^24.6.1",
    "@types/react": "^19.1.16",
    tsup: "^8.5.0",
    tsx: "^4.20.6",
    typescript: "^5.9.3"
  },
  engines: {
    node: ">=18"
  },
  bin: {
    "igloo-cli": "dist/cli.js",
    igloo: "dist/cli.js"
  },
  files: [
    "dist"
  ],
  type: "module"
};

// src/cli.tsx
import { jsx as jsx13 } from "react/jsx-runtime";
function parseArgv(argv) {
  const flags2 = {};
  const positionals = [];
  let showHelp2 = false;
  let showVersion2 = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      showHelp2 = true;
      continue;
    }
    if (value === "--version" || value === "-v") {
      showVersion2 = true;
      continue;
    }
    if (value.startsWith("--")) {
      const [name, inline] = value.slice(2).split("=");
      if (inline !== void 0 && inline.length > 0) {
        flags2[name] = inline;
        continue;
      }
      const next = argv[index + 1];
      if (next !== void 0 && !next.startsWith("-")) {
        flags2[name] = next;
        index += 1;
      } else {
        flags2[name] = true;
      }
      continue;
    }
    if (value.startsWith("-") && value.length > 1) {
      const name = value.slice(1);
      const next = argv[index + 1];
      if (next !== void 0 && !next.startsWith("-")) {
        flags2[name] = next;
        index += 1;
      } else {
        flags2[name] = true;
      }
      continue;
    }
    positionals.push(value);
  }
  if (flags2.t !== void 0 && flags2.threshold === void 0) {
    flags2.threshold = flags2.t;
    delete flags2.t;
  }
  if (flags2.T !== void 0 && flags2.total === void 0) {
    flags2.total = flags2.T;
    delete flags2.T;
  }
  return {
    command: positionals[0] ?? "intro",
    args: positionals.slice(1),
    flags: flags2,
    showHelp: showHelp2,
    showVersion: showVersion2
  };
}
function showHelpScreen(version) {
  const instance = render(/* @__PURE__ */ jsx13(Help, { version }));
  instance.waitUntilExit().then(() => process.exit(0));
}
function showVersion(version) {
  console.log(version);
  process.exit(0);
}
var { command, args, flags, showHelp, showVersion: shouldShowVersion } = parseArgv(
  process.argv.slice(2)
);
if (shouldShowVersion) {
  showVersion(package_default.version);
}
if (showHelp) {
  showHelpScreen(package_default.version);
} else {
  render(
    /* @__PURE__ */ jsx13(
      App_default,
      {
        command,
        args,
        flags,
        version: package_default.version
      }
    )
  );
}
//# sourceMappingURL=cli.js.map