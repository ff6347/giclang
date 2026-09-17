<!-- ABOUTME: Records the Slice 8 resizable workspace implementation checkpoint. -->
<!-- ABOUTME: Captures layout, persistence, accessibility, and regression findings. -->

# Slice 8 Workspace Layout

## Scope

Git-bug issue `d5f66fd` adds the shared three-region workspace: Monaco on the left, Canvas with Problems/Output in the middle, and unavailable tutor guidance on the right.

## Implementation

- [decision] React composes the browser application and nested FlexLayout models own application tabs, resizable Code panes, keyboard splitters, and serialized workspace state.
- [decision] Monaco keeps its imperative adapter. A React panel mounts `createGicEditor()` directly and disposes it without adding another Monaco binding.
- [decision] A versioned GIC envelope stores FlexLayout JSON. Invalid state restores defaults, and Reset Layout replaces only the layout model so the current source survives.
- [technique] Problems and Output render even while inactive so structured results remain observable and ready when their tab is selected.
- [technique] Current-source failures update Problems while the Problems/Output tabset retains the student's selected tab.
- [technique] The Canvas obtains its rendering context on mount so clearing it after a diagnostic preserves the deterministic PNG representation expected by browser acceptance.
- [decision] The unavailable tutor explicitly says that tutoring is optional, provides setup guidance and Retry, and does not gate editing.

## Acceptance

- [verification] Focused Playwright acceptance covers the application tabs, nested Code geometry, keyboard resizing, restart persistence, Problems/Output selection, status counts, tutor fallback controls, and Reset Layout without source loss.
- [verification] Existing Monaco, print-output, and deterministic Canvas acceptance remains part of the full Firefox regression suite.

## Verification

- `pnpm test` — 416 passed.
- `pnpm test:compact` — passed.
- `pnpm typecheck` — passed.
- `pnpm typecheck:browser` — passed.
- `pnpm lint` — no warnings or errors.
- `pnpm fmt:check` — passed.
- `pnpm build:browser` — passed with the documented Monaco chunk-size warning.
- Playwright Firefox acceptance — 53 tests passed.

## UI Follow-up

- [decision] An outer FlexLayout owns Code, Settings, Examples, Docs, and About while keeping every tab mounted. Settings contains Format on save, Reset Layout, and desktop tutor-provider guidance; Examples and Docs are placeholders for their owning slices.
- [decision] Code nests a second FlexLayout: headerless Editor and Tutor side panes surround a middle column with headerless Preview above the Problems/Output tabset.
- [decision] Reset Layout restores Code geometry and selects Problems while preserving the current GIC source and selected top-level application tab.
