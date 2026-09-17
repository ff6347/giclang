<!-- ABOUTME: Records the Slice 8 resizable workspace implementation checkpoint. -->
<!-- ABOUTME: Captures layout, persistence, accessibility, and regression findings. -->

# Slice 8 Workspace Layout

## Scope

Git-bug issue `d5f66fd` adds the shared three-region workspace: Monaco on the left, Canvas with Problems/Output in the middle, and unavailable tutor guidance on the right.

## Implementation

- [decision] React composes the browser application and FlexLayout owns resizable panels, border tabs, keyboard splitters, and serialized layout state.
- [decision] Monaco keeps its imperative adapter. A React panel mounts `createGicEditor()` directly and disposes it without adding another Monaco binding.
- [decision] A versioned GIC envelope stores FlexLayout JSON. Invalid state restores defaults, and Reset Layout replaces only the layout model so the current source survives.
- [technique] Problems and Output render even while inactive so structured results remain observable and ready when their tab is selected.
- [technique] Current-source failures select Problems only when the lower panel is hidden. A visible lower panel retains its selected tab while counts and content update.
- [technique] The Canvas obtains its rendering context on mount so clearing it after a diagnostic preserves the deterministic PNG representation expected by browser acceptance.
- [decision] The unavailable tutor explicitly says that tutoring is optional, provides setup guidance and Retry, and can be hidden without affecting editing.

## Acceptance

- [verification] Focused Playwright acceptance covers visible regions, keyboard resizing, restart persistence, hide/show controls, Problems/Output selection, status counts, error reopening, tutor fallback controls, and Reset Layout without source loss.
- [verification] Existing Monaco, print-output, and deterministic Canvas acceptance remains part of the full Firefox regression suite.

## Verification

- `pnpm test` — 416 passed.
- `pnpm test:compact` — passed.
- `pnpm typecheck` — passed.
- `pnpm typecheck:browser` — passed.
- `pnpm lint` — no warnings or errors.
- `pnpm fmt:check` — passed.
- `pnpm build:browser` — passed with the documented Monaco chunk-size warning.
- Playwright Firefox acceptance — 54 tests passed: 53 on the isolated worktree server and the origin-pinned local-assets check on the standard port.

## UI Follow-up

- [decision] Preview is the central FlexLayout tab. Selecting it while active collapses its content, while border tabs remain the sole hide/show controls for Editor, Tutor, Problems, and Output.
- [decision] Code, Settings, Examples, Docs, and About are top-level React tabs whose content remains mounted. Settings contains Format on save, Reset Layout, and desktop tutor-provider guidance; Examples and Docs are placeholders for their owning slices.
- [decision] Reset Layout selects Preview and restores the workspace defaults while preserving the current GIC source and selected top-level application tab.
