<!-- ABOUTME: Records the selected browser workspace framework and layout state boundary. -->
<!-- ABOUTME: Defines how React, FlexLayout, Monaco, and persisted panel state interact. -->

# Decision: Browser Workspace Layout

Status: Accepted for v0.9

## Decision

The shared browser IDE uses React for application composition and FlexLayout for the resizable workspace. FlexLayout owns panel geometry, tab selection, keyboard-operable splitters, and serializable layout state.

Monaco remains an imperative integration through GIC's existing `createGicEditor()` adapter. React mounts and disposes that adapter; GIC does not add a separate React Monaco binding.

An outer FlexLayout owns the top-level Code, Settings, Examples, Docs, and About tabs. It keeps all top-level tab content mounted so switching away from Code does not discard Monaco, Canvas, worker, or workspace state. Examples and Docs are placeholders until their owning slices supply document and reference behavior.

The Code tab contains a nested FlexLayout constrained to the product layout rather than exposing a general-purpose docking environment:

- Editor and Tutor are headerless left and right panes.
- The middle column stacks a headerless Preview above the Problems/Output tabset.
- Problems and Output are the only visible tabs inside Code.
- Arbitrary panel closing, dragging, floating, and docking are disabled.

The top-level Settings tab contains Format on save, Reset Layout, and tutor-provider guidance. Persisted workspace state uses a versioned GIC-owned envelope around FlexLayout's JSON model. Invalid or unsupported state falls back to the default workspace.

## Rationale

Slice 8 requires nested resizing, tabs, restart persistence, programmatic panel selection, and reset behavior. The accepted browser accessibility boundary also requires keyboard operation and focus behavior. FlexLayout supplies WAI-ARIA tabs and keyboard-resizable separators as one maintained layout model.

Dockview was the strongest framework-neutral candidate, but its splitview sashes are pointer-driven and do not implement keyboard resizing. Split.js and the React split-panel libraries solve resizing but leave tabs and workspace state to GIC. Lumino introduces a larger widget framework than this workspace needs.

## Consequences

- React, React DOM, and FlexLayout are browser application dependencies.
- Sass compiles FlexLayout's published theme source because its CSS package references an unpublished source map.
- React remains outside the language core, worker, Canvas renderer, and language service.
- Resetting layout state must not reset the active GIC source.
- Reset Layout restores default Code geometry with Problems selected.
- Reset Layout does not change the selected top-level application tab.
- Diagnostics update the Problems badge and content without replacing the student's selected Problems/Output tab.
- Layout behavior is verified through the real Monaco, worker, FlexLayout, and Canvas path in Firefox.

## Related Sources

- [Browser IDE Technology and Sandbox Model](browser-ide-technology-sandbox.md)
- [v0.9 vertical slices](../plans/vertical-slice-roadmap.md)
- git-bug issue `d5f66fd` — Build the resizable IDE workspace
- [FlexLayout accessibility](https://github.com/caplin/FlexLayout/blob/master/docs/accessibility.md)
