<!-- ABOUTME: Defines the unresolved desktop shell and filesystem decision gate. -->
<!-- ABOUTME: Compares no desktop shell, Deno Desktop, browser file APIs, and alternative shells without selecting one. -->

# Decision: Desktop Shell and Filesystem Model

Status: Unresolved

## Decision Question

What desktop shell, filesystem access model, project-root behavior, permission
boundary, and packaging scope will GIC use, if any? This decision defines
whether desktop distribution is in scope and how file open/save behavior relates
to the browser IDE.

## Current Baseline

- [Memory](../MEMORY.md) records Deno Desktop as a candidate shell for
  filesystem access and desktop distribution, not as an adopted platform.
- Browser IDE work comes before desktop packaging in the lesson order.
- [Deno Desktop packaging](../milestones/deno-desktop-packaging.md) remains
  blocked unless this decision explicitly names Deno Desktop for packaging.
- Browser IDE milestones are not blocked by this desktop-shell decision; they
  can proceed with browser-local storage, browser file APIs, or no native
  filesystem bridge as selected elsewhere.
- File open/save, project-root, and permissions behavior must be decided before
  packaging work begins.
- Relevant browser IDE milestones:
  - [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
  - [Add browser IDE animation and runtime-error UX](../milestones/browser-ide-animation-runtime-error-ux.md)
  - [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- Relevant specification anchors:
  - [Project structure](<../Language specification rev 2.1.md#project-structure>)
  - [File extension](<../Language specification rev 2.1.md#file-extension>)
  - [Live preview panel](<../Language specification rev 2.1.md#live-preview-panel>)
  - [CLI tool](<../Language specification rev 2.1.md#cli-tool>)

## Why This Is a Gate

Desktop packaging cannot proceed on an assumed shell or filesystem model. This
is not a gate for browser IDE work: the browser IDE can proceed without a
selected desktop shell or native filesystem bridge. The decision gate separates
browser IDE behavior from desktop distribution, avoids accidental commitment to
Deno Desktop, and requires explicit handling of permissions, project roots, save
locations, and file-extension workflow.

## Options and Consequences

- Option: `No desktop shell for now`
  - Consequences: keeps attention on browser IDE and core language work; leaves
    native file open/save and offline packaged distribution unresolved; prevents
    Deno Desktop packaging from beginning.
- Option: `Deno Desktop packaging after browser IDE completion`
  - Consequences: treats Deno Desktop as a candidate only until browser behavior
    is known; requires a Deno Desktop permission and filesystem model; keeps
    packaging blocked until Deno Desktop is explicitly named by this decision.
- Option: `Browser-only PWA/File System Access style model`
  - Consequences: can preserve a web-first runtime and avoid desktop shell
    dependencies; file access varies by browser support and permission UX;
    project-root behavior may need fallbacks for unsupported browsers.
- Option: `Alternative desktop shell researched later`
  - Consequences: leaves room for Tauri, Electron, or another shell without
    committing now; delays packaging architecture; may require future comparison
    of bundle size, permissions, update flow, and browser-engine behavior.

## Questions Before Choosing

- Is desktop distribution needed before the browser IDE milestones are complete?
- What file open/save flow is required for `.gic` files?
- Does GIC need a project-root concept or single-file sketches for the first
  desktop scope?
- Which permissions are acceptable for reading, writing, and remembering recent
  files?
- How does desktop packaging interact with CLI `gic check` and `gic run`?
- What offline behavior is required, and can a browser-only model provide it?

## Decision Checklist

- Desktop shell scope documented as unresolved, included, or excluded for the
  relevant phase.
- File open/save behavior documented.
- Project-root behavior documented.
- Permission model documented.
- Browser IDE dependency on desktop features documented.
- Deno Desktop candidate status documented without silent adoption.

## Unblocks

- [Deno Desktop packaging](../milestones/deno-desktop-packaging.md), only if
  this decision selects Deno Desktop for packaging.

## Related Guidance

- [Memory](../MEMORY.md)
- [Lessons](../LESSONS.md)
- [Deno Desktop packaging](../milestones/deno-desktop-packaging.md)
- [Build the browser IDE MVP with diagnostics and static preview](../milestones/browser-ide-mvp-diagnostics-static-preview.md)
- [Add browser IDE animation and runtime-error UX](../milestones/browser-ide-animation-runtime-error-ux.md)
- [Add browser IDE language assistance](../milestones/browser-ide-language-assistance.md)
- [Project structure](<../Language specification rev 2.1.md#project-structure>)
- [File extension](<../Language specification rev 2.1.md#file-extension>)
- [Live preview panel](<../Language specification rev 2.1.md#live-preview-panel>)
- [CLI tool](<../Language specification rev 2.1.md#cli-tool>)

## Non-Goals

- Selecting browser editor technology or sandbox model.
- Selecting LSP or VS Code extension scope.
- Selecting export or server render backends.
- Changing language grammar, runtime semantics, or file extension.
