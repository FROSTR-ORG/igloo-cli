# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds all TypeScript. `src/cli.tsx` is the entry point, `src/App.tsx` routes Ink commands, `src/components/` hosts reusable views, and `src/keyset/` manages key material flows. Keep helpers near their callers; split files past ~150 lines into focused modules under `components/` or `keyset/`.
- Place specs alongside code (`feature.test.ts`) or under `src/__tests__/`. Generated bundles live in `dist/`, rebuilt by `npm run build`; never edit compiled output.
- Prompts and automation cues live in `llm/`; update them whenever UX or protocol semantics change so downstream agents stay aligned.

## Build, Test, and Development Commands
- `npm run dev` — hot-reloads the CLI via `tsx`, ideal while iterating on Ink screens.
- `npm run build` — invokes `tsup` on `src/cli.tsx` and emits `dist/cli.js` with the shipping shebang.
- `npm run start` — executes the compiled CLI exactly as users receive it; tack on flags like `npm run start -- --help` for smoke checks.
- `npm run typecheck` / `npm test` — run the TypeScript compiler with `--noEmit`; treat failures as release blockers.

## Coding Style & Naming Conventions
- Stick to TypeScript + ESM, 2-space indentation, single quotes, trailing commas, and imports sorted shallow-to-deep.
- Name components `PascalCase`, utilities `camelCase`, constants `SCREAMING_SNAKE_CASE`, and CLI flags lowercase (e.g., `--verbose`).
- Add concise comments only when intent is non-obvious—serialization boundaries, key lifecycles, or tricky Ink flows.

## Testing Guidelines
- Lean on type safety first; add `node:test` or `vitest` suites for branching logic. Name files `feature.test.ts` and colocate when feasible.
- Document manual checks (commands, sample args) in PRs so reviewers can replay the scenario quickly.

## Commit & Pull Request Guidelines
- Commit subjects stay imperative, under 72 characters (`Add passphrase prompt`), and focus on a single concern. Reference issues in the body when helpful.
- PRs summarize user impact, link tracking issues, and attach screenshots or terminal recordings for UX shifts.
- Call out edits to `llm/` or cryptographic paths so reviewers can validate downstream implications.

## Security & Configuration Tips
- Use Node.js 18+ (`nvm use 18`) before installing dependencies. Never commit production secrets; treat `tmp-shares/` and similar artifacts as disposable.
- Remove temporary key files and redact sample payloads before pushing branches or publishing packages.
