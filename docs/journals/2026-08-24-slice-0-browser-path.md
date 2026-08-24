<!-- ABOUTME: Records the Slice 0 browser architecture decisions. -->
<!-- ABOUTME: Captures the thin editor, execution, preview, service, and browser-test boundaries. -->

# Slice 0 Browser Path Decisions

## Summary

Resolved the two browser architecture gates required before Slice 1 planning.
The selected path favors rapid visual testing without selecting the final editor
or introducing language-service transports.

## Browser Shell and Execution

- [decision] The first browser shell uses a plain `<textarea>`; the final editor
  remains deferred.
- [decision] Source changes start a preview automatically after a short idle
  period.
- [decision] Preview execution runs in a dedicated Web Worker. A new source
  change or execution timeout terminates active work.
- [decision] The main thread renders structured output to Canvas. GIC source is
  interpreted and does not require iframe isolation.
- [decision] The previous image remains visible during execution, is replaced on
  success, and is cleared on diagnostics or timeout.
- [decision] Playwright with Firefox is the required browser test path.

## Language-Service Scope

- [decision] The browser calls the shared browser-neutral core directly.
- [decision] Diagnostics are the only language assistance included before Slice 6.
- [decision] LSP, VS Code, syntax highlighting, completion, hover, signature
  help, go-to-definition, and documentation comments remain outside the current
  vertical browser path.

## Workflow

- [preference] Slice work uses a normal feature branch in the project directory
  when Fabian and one teaching agent work together. Separate worktrees are for
  parallel agents that need isolation.
- [preference] Fabian implements project behavior while the agent guides,
  documents agreed decisions, and reviews working-tree changes.

## Verification

- `pnpm fmt:check` passed after the decision-record updates.
- `git diff --check` passed after the decision-record updates.
- No executable code changed.

## Next Step

After Slice 0 review and close-out, convert Slice 1 into a small plan beginning
with one source-level acceptance program and explicit Firefox verification. Do
not scaffold the browser application before that plan is reviewed.
