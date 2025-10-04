# Repository Guidelines

## Project Structure & Module Organization
The CLI lives in `src/cli.tsx`, which bootstraps Ink rendering. Routes and screen wiring belong in `src/App.tsx`, while reusable UI sits under `src/components/`. Key exchange and credential helpers stay in `src/keyset/`. Keep feature-specific helpers close to their caller; split files that exceed ~150 lines into focused modules. Tests may live beside the implementation as `feature.test.ts` or under `src/__tests__/`. Generated bundles in `dist/` are read-only artifacts. Protocol prompts and agent scripts live in `llm/`; keep them updated whenever UX flows change so downstream tooling stays consistent.

## Build, Test, and Development Commands
Use `npm run dev` for hot-reloading during Ink development. Run `npm run build` to compile the distributable CLI via `tsup` into `dist/cli.js`. Smoke-test the bundled build with `npm run start -- --help` or alternate flags. Type safety and lints run through `npm run typecheck`, and `npm test` executes the project’s test suite; treat any failure as a release blocker.

## Coding Style & Naming Conventions
We target Node.js 18+, TypeScript + ESM modules, 2-space indentation, single quotes, trailing commas, and imports ordered shallow-to-deep. Components adopt `PascalCase`, utilities use `camelCase`, constants prefer `SCREAMING_SNAKE_CASE`, and CLI flags remain lower-case (e.g., `--verbose`). Document non-obvious flows with concise comments, especially around key lifecycle management.

## Testing Guidelines
Favor type coverage first; add `node:test` or `vitest` specs when logic branches or data transforms appear. Test files follow the `feature.test.ts` pattern and should exercise both happy paths and failure modes. Run the full suite with `npm test` before opening a PR and capture any manual validation steps in the PR description for replayability.

## Commit & Pull Request Guidelines
Write imperative, single-purpose commit subjects under 72 characters (e.g., `Add passphrase prompt`) and add contextual detail in the body if necessary. PRs must summarize user impact, reference tracking issues, and attach terminal recordings or screenshots for UX updates. Call out edits to `llm/` or cryptographic logic so reviewers prioritize a second pass.

## Security & Configuration Tips
Install dependencies under Node.js 18 via `nvm use 18`. Never commit secrets or temporary key material; treat `tmp-shares/` as disposable. Remove any generated keys and redact sensitive payloads before pushing or publishing.
