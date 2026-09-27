<!-- ABOUTME: Records the v0.9 desktop shell direction and privileged filesystem boundaries. -->
<!-- ABOUTME: Selects Tauri, native Rust providers, one-document workflows, and fallbacks. -->

# Decision: Desktop Shell and Filesystem Model

Status: Accepted for v0.9

## Decision Question

Which desktop shell will host the shared GIC IDE, what filesystem and credential capabilities cross its privileged boundary, and what evidence triggers a shell fallback?

## Decision

### Shell direction

- The primary v0.9 distribution is a dedicated-window desktop application.
- Use Tauri 2 to package the shared browser UI rather than rebuilding the IDE for desktop.
- The application owns every required process. Students never start a server, sidecar, or terminal command for normal use.
- macOS and Windows packages are release requirements. Linux is best-effort.
- Keep static authoring in one Tauri process. Native dialogs, files, credentials, and provider calls stay behind operation-specific Rust commands.
- Implement the optional tutor with a GIC-owned provider-neutral Rust interface backed by Rig. Keep the narrow GIC-owned ChatGPT device-authorization port because Rig 0.42 couples its public device-flow entry point to a completion request.
- Keep Electron as the fallback only if production provider or platform requirements cannot be met through the narrow native boundary. The accepted v0.9 path does not require a Node sidecar.
- No built-in updater is included before 1.0; students install replacement packages.

### Shared UI and bridge

- Desktop and PWA reuse one UI and browser-neutral core.
- The desktop exposes a narrow typed bridge for native file dialogs, file reads/writes, settings, recovery, workspace management, credentials, external application launch, and application lifecycle.
- The webview receives only the minimum data needed for the selected operation.
- The bridge does not expose arbitrary shell execution or unrestricted filesystem access.
- Core language, Canvas rendering, Monaco, diagnostics, output, and export behavior stay on the shared side of the boundary.

### Document workflow

- The IDE edits one `.gic` document at a time.
- Open, Save, Save As, recent files, dirty indication, and discard warnings are explicit operations.
- Source files are never silently saved.
- Format-on-save, when enabled, runs once as part of explicit saving.
- Bundled examples are immutable sources opened as editable unsaved copies that require Save As.
- Private recovery snapshots protect unsaved work but never silently replace or write the selected `.gic` file.
- Renaming a sketch inside GIC updates tutor-session relationships. Continuing a session with another sketch clones the session and preserves the original.

### Workspace

The default desktop workspace is Processing-style and rooted at `~/Documents/gestalten-in-code/`:

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
- `.agents/skills/gic-tutor/SKILL.md` is the canonical Socratic policy used by GIC, Codex, and OpenCode.
- Bundled examples and reference material are immutable sources.
- First run installs managed support files; Settings offers Repair/Reinstall and Uninstall.
- Updates replace unmodified managed files, flag modified files, and never overwrite user changes.
- External Codex/OpenCode sessions are launched with this workspace as their working directory so project discovery finds the guidance.

### Credentials

- Credentials live outside the webview in an app-owned plaintext `auth.json` under the platform-standard application configuration directory.
- Writes and replacements are atomic.
- POSIX files use mode `0600`; Windows uses an equivalent owner-only ACL.
- Sign-out deletes the corresponding stored credential.
- Raw credentials never enter webview storage, logs, exports, tutor prompts, or session JSONL.
- An operating-system credential vault is intentionally not required for v0.9.

## PWA Boundary

The tutor-less PWA does not use the desktop bridge. It opens source through upload/file-picker input and saves through download. Persistent File System Access handles are not required. Browser-private storage may hold settings and recovery snapshots, but not provider credentials because the PWA has no integrated tutor.

## Current Baseline

- The shared browser preview runs from built web assets and uses a browser-neutral core.
- The production Tauri shell packages the shared IDE and exposes allowlisted settings plus native one-document Open, Save, and Save As operations.
- Native document paths stay behind one active random capability. The desktop webview receives only document identity, name, and source.
- Desktop settings and recovery use separate host boundaries; the production credential store remains pending tutor work.
- The retained [Tauri shell spike](../../spikes/tauri-app-shell/) packages built assets, exercises webview/Rust callbacks and lifecycle, and tests an opaque-document-ID adapter without a development server or companion process.
- The retained [Tauri/Rig tutor spike](../../spikes/tauri-rig-tutor/) streams OpenCode Zen and ChatGPT subscription responses through a packaged UI. It owns credentials and provider calls in Rust and exposes typed events to the webview.
- The retained [Electron spike](../../spikes/electron-app-shell/) establishes a fallback and size comparison; it is not the selected runtime.
- [The v0.9 roadmap](../plans/vertical-slice-roadmap.md) places production desktop and provider work after the completed shell/provider spikes and before signing and release validation.

## Why This Is a Gate

Windowing, packaged callbacks, filesystem permissions, credentials, and provider runtimes differ materially across shells and operating systems. A narrow bridge plus explicit evidence prevents UI work from becoming coupled to one unproven runtime and prevents secrets or broad host capabilities from leaking into the webview.

## Considered Options

- **Tauri with native Rust host and Rig — selected.** The packaged spikes proved the small static shell, restricted file adapter, OpenCode streaming, ChatGPT device authorization, persisted authentication reuse, provider diagnostics, and ChatGPT subscription streaming on macOS without a companion process.
- **Electron with Pi libraries — retained fallback.** It packaged and exercised deterministic Pi streaming and cancellation, but its recorded unsigned macOS application was 365 MB and included the Chromium, Node, helper-process, and framework surface. The comparable Tauri shell was 8.5 MB; the provider spike grew to 15 MB.
- **Deno Desktop — rejected for v0.9.** Deno 2.9 packaged a webview application, but its official documentation states that native file and folder pickers are not exposed as a first-class API. The webview file-input workaround did not satisfy the required native Save and Save As workflow.
- **Tauri with a Node sidecar — not required.** Native Rust plus Rig met the provider boundary. Adding a sidecar would introduce cross-process lifecycle, packaging, and failure states without evidence of a current need.
- **PWA as primary.** Simpler distribution, but cannot satisfy the selected dedicated-window, provider-auth, and beginner file-workflow requirements as reliably.
- **Local browser server.** Rejected because students would need to manage a companion process or terminal.

## Consequences and Deferred Details

- The spike code is retained as evidence and a production reference, not imported as production application code.
- Production must preserve the opaque document-ID and typed tutor-event boundaries while integrating the shared IDE rather than copying the spike UI.
- The selector lists only models supported by a bundled provider adapter and offered by its current catalog; catalog presence does not guarantee account access. It identifies them as `opencode-zen/<model>`, `openrouter/<model>`, `opencode-go/<model>`, or `openai-codex/<model>` as each provider becomes callable; a model name must not be inferred from the general ChatGPT model list.
- The spike stored the OpenCode key only in memory and used a minimal ChatGPT token file. Production credential persistence must still satisfy the atomic replacement and owner-only access contract below.
- Session records and source files remain user-readable even though credentials do not cross into those directories.
- First-run updates need a visible conflict flow for modified managed files; comparison and presentation are resolved by [Workspace Managed Files](workspace-managed-files.md).
- Manual packaged native-dialog interaction, Windows package execution, recovery expiry, multiple-instance coordination, moved-file handling, Windows ACL implementation, installer formats, architectures, and signing identities remain explicit production or release checks.

## Evidence and Sources

### Retained executable evidence

- [`spikes/tauri-app-shell/`](../../spikes/tauri-app-shell/) records the static shell source, exact Tauri/Rust/webview versions, bridge tests, package verifier, 8.5 MB macOS artifact result, and unrun Windows/manual-dialog checks.
- [`spikes/tauri-rig-tutor/`](../../spikes/tauri-rig-tutor/) records the provider-neutral Rust protocol, Tauri capability, OpenCode adapter, ChatGPT device authorization, safe diagnostics, deterministic tests, exact versions, and 15 MB package result.
- [`spikes/electron-app-shell/`](../../spikes/electron-app-shell/) records the sandboxed Electron/Pi comparison, deterministic stream/cancellation tests, exact runtime versions, and 365 MB package result.
- Git-bug issues `a707392`, `421132b`, and `24b7ffb` preserve acceptance criteria and chronological human-test observations.

### External material consulted

- [Deno Desktop](https://docs.deno.com/runtime/desktop/) and [Deno Desktop dialogs](https://docs.deno.com/runtime/desktop/dialogs/) established the Deno 2.9 runtime and the absence of first-class native file/folder pickers.
- [Tauri capabilities](https://v2.tauri.app/security/capabilities/), [core permissions](https://v2.tauri.app/reference/acl/core-permissions/), and the [JavaScript event API](https://v2.tauri.app/reference/javascript/api/namespaceevent/) established that frontend event listening requires an explicit capability. The missing `core:event:allow-listen` permission was then reproduced and corrected in the packaged spike.
- [Tauri dialog plugin](https://v2.tauri.app/plugin/dialog/) established supported native Open and Save APIs. [Tauri Windows installer guidance](https://v2.tauri.app/distribute/windows-installer/) established the MSI/NSIS host and tooling constraints recorded by the shell spike.
- [Rig 0.42 ChatGPT provider documentation](https://docs.rs/rig-core/0.42.0/rig_core/providers/chatgpt/) and its pinned crate source were inspected for the subscription backend, authentication context, request path, headers, model handling, and stream error types.
- Pi's pinned [`openai-codex` provider](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/src/providers/openai-codex.ts) and [Codex Responses implementation](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/src/api/openai-codex-responses.ts) were inspected for the ChatGPT backend, account extraction, request headers, streaming, and provider-error behavior.
- Pi's pinned [Zen provider](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/src/providers/opencode.ts), [Go provider](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/src/providers/opencode-go.ts), [shared session-header adapter](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/src/providers/opencode-headers.ts), and [catalog generator](https://github.com/earendil-works/pi/blob/6671c604766b3670ed95f405aa7856835d0ca702/packages/ai/scripts/generate-models.ts#L2034-L2072) established that Pi treats Zen and Go as separate provider IDs and model catalogs. They share API-key and session-header behavior, but the generator uses `/zen` for Zen and `/zen/go` for Go, then selects Responses, Messages, Google, or Chat Completions per model metadata. The retained GIC spike implements Zen only.
- [OpenCode Zen documentation](https://opencode.ai/docs/zen/) established its OpenAI-compatible endpoint and model catalog at spike time.
- [OpenAI Codex model documentation](https://developers.openai.com/codex/models) was consulted but did not list every model available in the tester's live Pi subscription catalog. It is not treated as the sole production catalog source.

### Human validation

- A valid OpenCode Zen key was entered through the packaged UI and `mimo-v2.5-free` returned a streamed response.
- ChatGPT device authorization completed in the packaged UI and persisted across rebuilt application launches.
- `gpt-5.3-instant` reached the authenticated Codex backend but returned HTTP 400 because it was unsupported with a ChatGPT account.
- The tester's working Pi subscription catalog supplied `gpt-5.6-luna`; the same model then returned a successful ChatGPT subscription response through the packaged Tauri/Rig application.
- No Windows package, signing/notarization workflow, or manual packaged native-dialog click-through was claimed during these tests.

## Decision Checklist

- Dedicated desktop window selected.
- Tauri 2 native host and Electron fallback documented.
- No companion-process management required from students.
- Shared UI and narrow bridge selected.
- One-document, example, save, and recovery behavior documented.
- Workspace and managed-file ownership documented.
- Plaintext protected credential contract documented.
- macOS/Windows release gate and Linux best-effort status documented.
- Auto-update excluded before 1.0.

## Unblocks

- [Tauri desktop packaging](../milestones/tauri-desktop-packaging.md)
- v0.9 roadmap Slices 12, 15, and 16
- v0.9 roadmap Slices 9 and 12 through 17

## Related Guidance

- [v0.9 vertical slices](../plans/vertical-slice-roadmap.md)
- [Browser IDE technology and sandbox](browser-ide-technology-sandbox.md)
- [Language-service scope](language-service-lsp-vscode-scope.md)
- [Implementation architecture](<../../docs/Language specification.md#implementation-architecture>)
- [File extension](<../../docs/Language specification.md#file-extension>)
- [CLI tool](<../../docs/Language specification.md#cli-tool>)

## Non-Goals

- Multiple-document tabs or a general project explorer.
- Broad shell or filesystem access from the webview.
- A separately managed local server.
- Operating-system credential vault integration.
- Built-in updates before 1.0.
- Mobile-native packaging.
- Making Linux parity a release blocker.
- Selecting CLI export or server-render backends.
