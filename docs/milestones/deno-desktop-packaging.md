<!-- ABOUTME: Explains conditional Deno Desktop packaging for the completed GIC browser IDE. -->
<!-- ABOUTME: Defines desktop-shell prerequisites, filesystem boundaries, non-goals, and verification. -->

# Milestone: Package IDE with Deno Desktop

## Learning Goal

Package the completed browser IDE as a desktop app only if the desktop decision explicitly selects Deno Desktop.

## Prerequisites

- `../decisions/desktop-shell-filesystem.md` is blocking and must explicitly select Deno Desktop before this milestone can proceed.
- `../decisions/browser-ide-technology-sandbox.md` exists and still applies to the packaged browser IDE.
- [Browser IDE MVP diagnostics and static preview](browser-ide-mvp-diagnostics-static-preview.md) is complete.
- [Browser IDE animation and runtime-error UX](browser-ide-animation-runtime-error-ux.md) is complete.
- [Browser IDE language assistance](browser-ide-language-assistance.md) is complete for the selected capability set.
- [Visual regression verification](example-program-visual-regression.md) exists for static and any selected animated fixtures.
- CLI [`check` and `run` behavior](cli-check-run-entry-points.md) is available for comparison and project workflows.

## Concepts to Understand

- Desktop packaging should wrap the existing browser IDE instead of forking behavior.
- Filesystem permissions are a product boundary, not an implementation detail to guess.
- Open, save, and project-root behavior must follow the desktop-shell decision.
- A packaged app should preserve diagnostics, preview, animation, and language assistance behavior.
- If Deno Desktop is not selected, this lesson remains blocked or must be renamed and re-scoped.

## Relevant Specification Links

- [Project Structure](<../Language specification rev 2.1.md#project-structure>)
- [Implementation Architecture](<../Language specification rev 2.1.md#implementation-architecture>)
- [File Extension](<../Language specification rev 2.1.md#file-extension>)
- [Example Programs](<../Language specification rev 2.1.md#example-programs>)
- [Live Preview Panel](<../Language specification rev 2.1.md#live-preview-panel>)
- [CLI Tool](<../Language specification rev 2.1.md#cli-tool>)

## Included

- A packaging path for the existing browser IDE when Deno Desktop is explicitly selected.
- Packaged asset loading smoke coverage.
- `.gic` file open and save behavior following the selected filesystem model.
- Diagnostics, static preview, animation, runtime-error UX, and language assistance smoke checks inside the packaged app.
- Packaging metadata and version checks appropriate to the selected desktop shell.
- Permission checks that confirm filesystem access stays within the decision boundary.

## Grammar and AST Shape / Interface Boundary

No grammar or AST changes belong in this milestone.

The interface boundary is shell-to-IDE: the desktop shell packages the existing browser IDE without changing language behavior. Filesystem permissions, open-save flows, project-root rules, and any native bridge surface must follow `../decisions/desktop-shell-filesystem.md`.

## TDD-oriented Student Checklist

- Confirm the desktop decision explicitly selects Deno Desktop before writing packaging work.
- Add a failing packaged-asset smoke test or checklist item before wiring the shell.
- Add file open and save smoke coverage for `.gic` files.
- Add diagnostics and static preview smoke checks in the packaged app.
- Add animation and runtime-error smoke checks in the packaged app.
- Add packaging metadata and version checks.

## Non-Goals

- Selecting Deno Desktop.
- Broad filesystem access outside the selected permissions model.
- Rebuilding or forking the IDE for desktop.
- Mobile packaging.
- Auto-update systems or installers.
- Node or server render export.
- VS Code extension packaging.

## Verification

- `pnpm test`
- `pnpm typecheck`
- `pnpm fmt:check`
- `pnpm lint`
- The packaged app launches according to the desktop-shell decision.
- `.gic` open and save behavior follows the selected filesystem model.
- Static and animated examples match browser IDE behavior.
- Diagnostics and selected language assistance still work after packaging.
- Permissions remain limited to the documented desktop boundary.

## Notes / Decision Gates

`../decisions/desktop-shell-filesystem.md` is mandatory and must explicitly choose Deno Desktop. If the decision is absent, unresolved, or chooses a different shell, this milestone remains blocked or must be renamed and re-scoped.

Do not use this lesson to choose a desktop technology or expand filesystem access beyond the decision document.
