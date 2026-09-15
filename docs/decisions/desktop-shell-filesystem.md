<!-- ABOUTME: Records the v0.9 desktop shell direction and privileged filesystem boundaries. -->
<!-- ABOUTME: Defines Deno-first packaging, one-document workflows, credentials, and fallbacks. -->

# Decision: Desktop Shell and Filesystem Model

Status: Accepted for v0.9 with mandatory runtime spikes

## Decision Question

Which desktop shell will host the shared GIC IDE, what filesystem and credential
capabilities cross its privileged boundary, and what evidence triggers a shell
fallback?

## Decision

### Shell direction

- The primary v0.9 distribution is a dedicated-window desktop application.
- Pursue Deno Desktop first and package the shared browser UI rather than
  rebuilding the IDE for desktop.
- The application owns every required process. Students never start a server,
  sidecar, or terminal command for normal use.
- macOS and Windows packages are release requirements. Linux is best-effort.
- A desktop viability spike must prove windowing, packaged asset loading, native
  dialogs, lifecycle hooks, callback handling, and bridge behavior before
  dependent implementation.
- A Pi compatibility spike must prove streamed provider calls, Codex OAuth and
  refresh, OpenCode credentials, and restart behavior in the packaged runtime.
- If Pi modules are incompatible, port only the identified auth/runtime
  boundaries. If the resulting Deno application is not viable, use Electron.
  Tauri with a bundled Node SEA sidecar is the final fallback.
- No built-in updater is included before 1.0; students install replacement
  packages.

### Shared UI and bridge

- Desktop and PWA reuse one UI and browser-neutral core.
- The desktop exposes a narrow typed bridge for native file dialogs, file
  reads/writes, settings, recovery, workspace management, credentials, external
  application launch, and application lifecycle.
- The webview receives only the minimum data needed for the selected operation.
- The bridge does not expose arbitrary shell execution or unrestricted
  filesystem access.
- Core language, Canvas rendering, Monaco, diagnostics, output, and export
  behavior stay on the shared side of the boundary.

### Document workflow

- The IDE edits one `.gic` document at a time.
- Open, Save, Save As, recent files, dirty indication, and discard warnings are
  explicit operations.
- Source files are never silently saved.
- Format-on-save, when enabled, runs once as part of explicit saving.
- Bundled examples are immutable sources opened as editable unsaved copies that
  require Save As.
- Private recovery snapshots protect unsaved work but never silently replace or
  write the selected `.gic` file.
- Renaming a sketch inside GIC updates tutor-session relationships. Continuing a
  session with another sketch clones the session and preserves the original.

### Workspace

The default desktop workspace is Processing-style and rooted at
`~/Documents/gestalten-in-code/`:

```text
sketches/
sessions/
AGENTS.md
.agents/
  skills/
    gic-tutor/
      SKILL.md
      references/
```

- `AGENTS.md` is short always-on guidance.
- `.agents/skills/gic-tutor/SKILL.md` is the canonical Socratic policy used by
  GIC, Codex, and OpenCode.
- Bundled examples and reference material are immutable sources.
- First run installs managed support files; Settings offers Repair/Reinstall and
  Uninstall.
- Updates replace unmodified managed files, flag modified files, and never
  overwrite user changes.
- External Codex/OpenCode sessions are launched with this workspace as their
  working directory so project discovery finds the guidance.

### Credentials

- Credentials live outside the webview in an app-owned plaintext `auth.json`
  under the platform-standard application configuration directory.
- Writes and replacements are atomic.
- POSIX files use mode `0600`; Windows uses an equivalent owner-only ACL.
- Sign-out deletes the corresponding stored credential.
- Raw credentials never enter webview storage, logs, exports, tutor prompts, or
  session JSONL.
- An operating-system credential vault is intentionally not required for v0.9.

## PWA Boundary

The tutor-less PWA does not use the desktop bridge. It opens source through
upload/file-picker input and saves through download. Persistent File System
Access handles are not required. Browser-private storage may hold settings and
recovery snapshots, but not provider credentials because the PWA has no
integrated tutor.

## Current Baseline

- The shared browser preview already runs from built web assets and uses a
  browser-neutral core.
- The repository has no production desktop bridge, packaged shell, credential
  store, or one-document adapter.
- Pi's core agent/provider libraries support browser-style environments, while
  its coding-agent and documented OAuth login helpers include Node-oriented
  behavior that must be proven or narrowly replaced.
- [The v0.9 roadmap](../plans/vertical-slice-roadmap.md) places disposable shell,
  provider, and signing spikes before dependent production slices.

## Why This Is a Gate

Windowing, packaged callbacks, filesystem permissions, credentials, and
provider runtimes differ materially across shells and operating systems. A
narrow bridge plus explicit evidence prevents UI work from becoming coupled to
one unproven runtime and prevents secrets or broad host capabilities from
leaking into the webview.

## Considered Options

- **Deno Desktop with Pi modules — first choice.** Matches the TypeScript core
  and browser-compatible Pi packages with a small host boundary, subject to
  packaging and OAuth evidence.
- **Deno Desktop with narrow Pi ports — second choice.** Retains the shell when
  only specific Node auth/runtime assumptions fail; it must not become a fork
  of the full Pi coding agent.
- **Electron — third choice.** Provides mature Node compatibility and desktop
  packaging, at the cost of a larger runtime and security surface.
- **Tauri with Node SEA sidecar — final choice.** Provides a native window but
  adds cross-process lifecycle and packaging complexity; SEA alone is not a
  desktop shell.
- **PWA as primary.** Simpler distribution, but cannot satisfy the selected
  dedicated-window, provider-auth, and beginner file-workflow requirements as
  reliably.
- **Local browser server.** Rejected because students would need to manage a
  companion process or terminal.

## Consequences and Deferred Details

- Production shell code starts only after the desktop viability spike records a
  supported runtime version and package evidence.
- Provider implementation starts only after the Pi spike identifies the real
  compatibility boundary.
- Session records and source files remain user-readable even though credentials
  do not cross into those directories.
- First-run updates need a visible conflict flow for modified managed files; the
  exact diff or reveal interaction remains open.
- Recovery expiry, multiple-instance coordination, moved-file handling, Windows
  ACL implementation, installer formats, architectures, and signing identities
  remain explicit slice or spike decisions.

## Decision Checklist

- Dedicated desktop window selected.
- Deno-first path and fallback order documented.
- No companion-process management required from students.
- Shared UI and narrow bridge selected.
- One-document, example, save, and recovery behavior documented.
- Workspace and managed-file ownership documented.
- Plaintext protected credential contract documented.
- macOS/Windows release gate and Linux best-effort status documented.
- Auto-update excluded before 1.0.

## Unblocks

- [Deno Desktop packaging](../milestones/deno-desktop-packaging.md)
- v0.9 roadmap Spikes A, B, and D
- v0.9 roadmap Slices 9 and 12 through 17

## Related Guidance

- [v0.9 vertical slices](../plans/vertical-slice-roadmap.md)
- [Browser IDE technology and sandbox](browser-ide-technology-sandbox.md)
- [Language-service scope](language-service-lsp-vscode-scope.md)
- [Implementation architecture](<../Language specification.md#implementation-architecture>)
- [File extension](<../Language specification.md#file-extension>)
- [CLI tool](<../Language specification.md#cli-tool>)

## Non-Goals

- Multiple-document tabs or a general project explorer.
- Broad shell or filesystem access from the webview.
- A separately managed local server.
- Operating-system credential vault integration.
- Built-in updates before 1.0.
- Mobile-native packaging.
- Making Linux parity a release blocker.
- Selecting CLI export or server-render backends.
