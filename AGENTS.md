# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains all TypeScript sources; `cli.tsx` boots the Ink CLI, `App.tsx` routes commands, `components/` holds reusable views, and `keyset/` manages key material flows.
- Feature helpers should live beside their callers; break modules past ~150 lines into `src/components/` or `src/keyset/` folders for clarity.
- `dist/` is rebuilt by `npm run build`; never edit compiled artifacts directly.
- `llm/` stores prompt contexts and automation notes that agents consume—update these alongside UX or protocol changes so assistants stay in sync.

## Build, Test, and Development Commands
- `npm run dev` launches the CLI via `tsx`, reloading on code changes for fast iteration.
- `npm run build` bundles `src/cli.tsx` with `tsup`, targeting Node 18 and producing `dist/cli.js` with the proper shebang.
- `npm run start` executes the compiled CLI exactly as users receive it; prefer this for smoke checks.
- `npm run typecheck` and `npm test` enforce the TypeScript contract; run both before opening a PR.

## Coding Style & Naming Conventions
- Stick to TypeScript + ESM with React/Ink function components; prefer hooks and pure helpers.
- Use 2-space indentation, single quotes, trailing commas, and keep imports sorted by path depth.
- Name components with `PascalCase`, internal utilities with `camelCase`, and CLI flags in lowercase (e.g., `--verbose`).
- Document non-obvious logic with brief comments; avoid noise around straightforward assignments.

## Testing Guidelines
- Primary coverage relies on the compiler; failing type checks block releases.
- For logic-heavy flows, add `node:test` or `vitest` specs ending in `.test.ts`; colocate them with the implementation or under `src/__tests__/`.
- Capture manual verification steps (e.g., `npm run start -- --help`) in PR descriptions to help reviewers replay scenarios.

## Commit & Pull Request Guidelines
- Write imperative, present-tense subjects under 72 characters ("Add passphrase prompt"), and keep each commit focused.
- Reference related issues, summarize impactful changes, and attach screenshots or CLI recordings when UX updates apply.
- Call out edits to `llm/` so downstream agents can review semantic shifts.

## Security & Configuration Tips
- Require Node.js 18+ (`nvm use 18`) before installing dependencies or running builds.
- Treat `tmp-shares/` and `temp_password.txt` as disposable fixtures; never check in real secrets or credentials.
- Clear local artifacts containing sensitive data prior to sharing branches or publishing packages.
