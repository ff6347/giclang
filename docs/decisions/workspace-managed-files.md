<!-- ABOUTME: Resolves how Slice 13 managed files are compared, presented, and resolved. -->
<!-- ABOUTME: Fixes the conflict rule and the Settings support-files interaction. -->

# Decision: Workspace Managed Files

Status: Accepted for v0.9

## Decision Question

How does the desktop application tell unmodified managed support files apart from user-modified ones, and how are modified files presented and resolved?

## Decision

### Comparison

- Managed support files are `AGENTS.md`, `.agents/skills/gic-tutor/SKILL.md`, and every file under `.agents/skills/gic-tutor/references/`.
- The native host keeps an app-owned manifest next to `settings.json` mapping each managed relative path to the SHA-256 digest of the content it last installed or adopted.
- On reconcile:
  - a missing file is installed;
  - a file whose on-disk digest equals the recorded digest is replaced with the bundled version when the bundled version differs;
  - any other existing file is user-modified and is preserved, never overwritten.
- `sketches/` and `sessions/` are created as empty scaffolding and are never scanned or modified. Shipped `content/examples/` stay in the application and are not written into the workspace.

### Presentation

- Settings shows a Support files section listing each managed file as Missing, Up to date, or Modified.
- Modified rows offer Keep my version (adopts the current content as the new baseline) and Replace with GIC version (backs the current file up to `<name>.user-bak`, then installs the bundled version).
- No live text diff is shown in v0.9.

### Repair, update, reinstall, and uninstall

- First run and Repair/Update run the same reconcile.
- Uninstall removes only unmodified managed files, prunes emptied managed directories, and leaves user sketches, sessions, and modified files in place; it records the workspace as uninstalled so the next launch does not reinstall.
- Installing again re-runs reconcile, which restores missing files and still preserves any user modifications.

### Projects folder location

- On first run the application asks, before creating anything, where the projects folder lives and suggests the user's Documents folder.
- The chosen location is persisted as `gic.projectsDirectory` in the app-owned settings file and reused on later launches.
- Settings shows the current location with a Choose folder action; relocating re-points managed support files without migrating existing sketches.

### External assistants

- The host detects `codex` and `opencode` on `PATH`.
- Settings shows one explicit action per detected tool; the action label states that it opens a terminal in the workspace.
- Clicking the action opens the system terminal with the workspace as its working directory. No terminal is opened automatically, and assistants are not run headless.
- When a tool is missing or a terminal cannot be opened, Settings shows actionable install or fallback instructions.

## Why

Content digests are the only comparison that remains correct across application updates: a recorded digest distinguishes "unmodified previous version" from "user changed it". Preserving modified files and resolving conflicts in Settings keeps user edits safe without exposing broad filesystem access to the webview.

## Considered Options

- mtime or embedded version markers — rejected: unreliable across filesystems and copies.
- Three-way diff or merge — rejected: no baseline history is required.
- Running assistants headless in the background — rejected: `codex` and `opencode` are interactive CLIs with no usable background conversation.
