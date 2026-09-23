<!-- ABOUTME: Records the Slice 13 workspace, managed-file, and assistant-launch work. -->
<!-- ABOUTME: Captures the conflict-resolution decision and packaged-runtime follow-ups. -->

# Slice 13 Workspace Support

## Outcome

- [decision] Resolved the Slice 13 gate in `docs/decisions/workspace-managed-files.md`: managed files are compared by SHA-256 content digest recorded in an app-owned manifest, and modified files are preserved and resolved in Settings.
- [decision] The desktop workspace is rooted at `~/Documents/gestalten-in-code/` with `sketches/`, `sessions/`, `AGENTS.md`, and `.agents/skills/gic-tutor/` (`SKILL.md` and `references/`).
- [decision] Only `AGENTS.md`, the tutor `SKILL.md`, and `references/**` are managed. `sketches/` and `sessions/` are scaffolding and are never scanned or modified; bundled examples stay in the application.
- [decision] Reconcile runs at startup and on demand: it installs missing files, updates unmodified files, and preserves modified files. Uninstall removes only unmodified managed files, prunes emptied managed directories, and records the workspace as uninstalled.
- [decision] Settings shows a desktop-only Support files section with Install/Repair, Uninstall, Keep my version, and Replace with GIC version, plus explicit Codex/OpenCode terminal launch with install fallbacks.
- [decision] First run asks where the projects folder should live before creating it, suggests the Documents folder, and persists the chosen location as `gic.projectsDirectory`; Settings offers relocation.

## Evidence

- [evidence] 13 Rust tests cover first-run provisioning, idempotence, unmodified updates, modified preservation, keep/adopt, replace-with-backup, uninstall precision, directory pruning, reinstall, and pre-existing file preservation.
- [evidence] Three external-tool tests cover PATH detection, missing detection, and Windows candidate names.
- [evidence] Four browser-local tests cover presentation mapping: file titles, state labels, and assistant launch versus install guidance.
- [evidence] Core and browser typechecks, oxlint, oxfmt, 76 Firefox E2E tests, cargo test, clippy `-D warnings`, and cargo fmt all pass; the macOS `.app` and `.dmg` build from shared assets.

## Remaining Checks

- [risk] Packaged macOS still needs a human walkthrough of first-run provisioning, conflict flags, keep/replace, uninstall/reinstall, and assistant launch/fallback.
- [risk] Windows and Linux behavior remains unrun or unrecorded, matching the Slice 12 packaging gaps.
- [risk] External-assistant launch uses per-OS terminal commands; the macOS terminal-open path was not exercised manually.
