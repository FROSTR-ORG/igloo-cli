# CLI Routing & Prompt Handling

## Command matrix
- Top-level commands (`src/cli.tsx`, `src/App.tsx`):
  - `intro`, `setup`, `about` — existing informational screens.
  - `status` — delegates to keyset diagnostics.
  - `keys` — wraps the key conversion helpers (`KeyConvert`, `KeyHelp`).
- `share <subcommand>` — share-level flows (`add`, `list`, `load`, `status`, `signer`, `policy`).
  - `keyset <subcommand>` — keyset generation helpers (create/help).
- `parseArgv` normalises shorthand flags (`-t`, `-T`) and captures positional args allowing subcommand chains like `share status --share vault_share_1`.

## Ink router
- `App` inspects `command` and dispatches to subcomponents, passing along `args` and `flags`.
- `renderShare` handles the share namespace (add/list/load/status/signer/policy) and emits a deprecation notice when reached via legacy aliases.
- `renderKeyset` routes to the appropriate keyset sub-flow; defaults to `KeysetHelp` for unknown subcommands.
- `renderKeys` accepts shorthand flags (`--npub`, `--nsec`, etc.) or positional hints and drives `KeyConvert` for format translations; falls back to `KeyHelp` on missing inputs.

## Prompt resilience
- `src/components/ui/Prompt.tsx` blocks interactive input when `useStdin().isRawModeSupported` is false (e.g., CI pipelines).
- In non-TTY environments, prompts render a red warning advising use of CLI flags instead of crashing with `ERR_USE_STDIN`.
- Interactive flows continue to support line editing, cancellation via `Esc`, and validation error feedback.

## Automation detection
- Keyset flows detect whether automation flags were supplied (`--password`, `--password-file`, `--output`) and skip prompts accordingly.
- Status diagnostics auto-run when both share selection and password are provided.

## Summary
These routing and prompt updates allow igloo-cli to operate identically in interactive terminals and headless automation, while keeping each command’s UI self-contained within dedicated components.
