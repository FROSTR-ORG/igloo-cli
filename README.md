# igloo-cli

Command-line companion for the FROSTR signing stack, built with React, Ink, and TypeScript.

## Requirements

- Node.js 18 or newer
- npm 10 or newer (bundled with Node 20+)

## First run

```bash
npm install
npm run build
node dist/cli.js
```

You can link the binary for local experiments:

```bash
npm link
igloo-cli --help
```

## Commands

| Command | Description |
| --- | --- |
| `igloo-cli` | Show the igloo welcome screen with a frostr-themed snowflake. |
| `igloo-cli setup --threshold 2 --total 3` | Walk through a k-of-n bootstrap checklist. |
| `igloo-cli about` | Summarize the frostr architecture and sibling projects. |
| `igloo-cli status` | Placeholder for upcoming health probes. |

Use `--help` or `--version` at any time for metadata.

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

## Next ideas

1. Implement the `status` command to query connected bifrost nodes.
2. Persist workspace preferences (default thresholds, relay lists).
3. Import frostr account metadata for richer onboarding prompts.
