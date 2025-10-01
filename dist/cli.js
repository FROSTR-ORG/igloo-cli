#!/usr/bin/env node

// src/cli.tsx
import { render } from "ink";

// src/App.tsx
import { Box as Box4, Text as Text4 } from "ink";

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

// src/App.tsx
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function parseNumber(value, fallback) {
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}
function StatusStub() {
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx4(Text4, { color: "cyanBright", children: "Status probes are on the roadmap." }),
    /* @__PURE__ */ jsx4(Text4, { children: "The goal is to query Igloo Desktop, Frost2x, and other bifrost nodes to confirm relay reachability plus signer readiness." }),
    /* @__PURE__ */ jsx4(Text4, { children: "Open an issue if you would like to help shape the diagnostics payloads." })
  ] });
}
function App({ command: command2, flags: flags2, version }) {
  const normalized = command2.toLowerCase();
  const threshold = parseNumber(flags2.threshold, 2);
  const total = parseNumber(flags2.total, 3);
  switch (normalized) {
    case "setup":
      return /* @__PURE__ */ jsx4(Setup, { threshold, total });
    case "about":
      return /* @__PURE__ */ jsx4(About, {});
    case "status":
      return /* @__PURE__ */ jsx4(StatusStub, {});
    default:
      return /* @__PURE__ */ jsx4(
        Intro,
        {
          version,
          commandExamples: [
            "igloo-cli setup --threshold 2 --total 3",
            "igloo-cli about",
            "igloo-cli status"
          ]
        }
      );
  }
}
var App_default = App;

// src/components/Help.tsx
import { Box as Box5, Text as Text5 } from "ink";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function Help({ version }) {
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsxs5(Text5, { color: "cyanBright", children: [
      "igloo-cli v",
      version
    ] }),
    /* @__PURE__ */ jsx5(Text5, { children: "Usage: igloo-cli [command] [options]" }),
    /* @__PURE__ */ jsxs5(Box5, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "Commands" }),
      /* @__PURE__ */ jsx5(Text5, { children: "- intro (default)  Show the animated welcome." }),
      /* @__PURE__ */ jsx5(Text5, { children: "- setup            Step through signer bootstrapping." }),
      /* @__PURE__ */ jsx5(Text5, { children: "- about            Outline the FROSTR stack." })
    ] }),
    /* @__PURE__ */ jsxs5(Box5, { marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "Options" }),
      /* @__PURE__ */ jsx5(Text5, { children: "-h, --help       Print this message." }),
      /* @__PURE__ */ jsx5(Text5, { children: "-v, --version    Print the version." }),
      /* @__PURE__ */ jsx5(Text5, { children: "--threshold n    Override default share threshold." }),
      /* @__PURE__ */ jsx5(Text5, { children: "--total n        Override total number of shares." })
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
    ink: "^6.3.1",
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
import { jsx as jsx6 } from "react/jsx-runtime";
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
    flags: flags2,
    showHelp: showHelp2,
    showVersion: showVersion2
  };
}
function showHelpScreen(version) {
  const instance = render(/* @__PURE__ */ jsx6(Help, { version }));
  instance.waitUntilExit().then(() => process.exit(0));
}
function showVersion(version) {
  console.log(version);
  process.exit(0);
}
var { command, flags, showHelp, showVersion: shouldShowVersion } = parseArgv(
  process.argv.slice(2)
);
if (shouldShowVersion) {
  showVersion(package_default.version);
}
if (showHelp) {
  showHelpScreen(package_default.version);
} else {
  render(/* @__PURE__ */ jsx6(App_default, { command, flags, version: package_default.version }));
}
//# sourceMappingURL=cli.js.map