<!-- ABOUTME: Records the runtime evidence that selected Tauri for the v0.9 desktop application. -->
<!-- ABOUTME: Preserves provider findings, rejected alternatives, and remaining release checks. -->

# Tauri Runtime Decision

## Outcome

- [decision] Tauri 2 with operation-specific Rust commands is the v0.9 desktop runtime. Electron remains the fallback.
- [decision] The optional tutor uses a GIC-owned provider-neutral Rust event interface backed by Rig. A narrow GIC-owned device-authorization port starts ChatGPT sign-in without sending a completion.
- [decision] No Node sidecar is required by current static-authoring or tutor evidence.

## Evidence

- [evidence] The static Tauri spike packaged built web assets, exercised Rust/webview callbacks and lifecycle, and tested an opaque-document-ID adapter without a development server or companion process.
- [evidence] Human testing of the packaged tutor spike streamed OpenCode Zen `mimo-v2.5-free`, completed ChatGPT device authorization, reused authentication after a rebuilt launch, and received a ChatGPT subscription response from `gpt-5.6-luna`.
- [evidence] The comparable unsigned macOS artifacts recorded by the spikes were 8.5 MB for the static Tauri shell, 15 MB for the Tauri tutor, and 365 MB for Electron.
- [evidence] The source, exact dependency versions, verification scripts, and detailed limitations remain under `spikes/tauri-app-shell/`, `spikes/tauri-rig-tutor/`, and `spikes/electron-app-shell/`.

## Failed Approaches and Lessons

- [lesson] Deno Desktop packaged a webview application, but its documented lack of first-class native file and folder pickers did not meet the required Save and Save As workflow.
- [lesson] Tauri frontend event listening needs an explicit capability. Missing `core:event:allow-listen` made provider controls appear inert until the packaged diagnostic path exposed the registration failure.
- [lesson] Blocking all controls on asynchronous listener startup turned one bridge failure into an unusable UI. Listener readiness must remain observable and recoverable.
- [lesson] General public model pages can lag a working subscription catalog. `gpt-5.3-instant` reached the authenticated backend but returned HTTP 400; the tester's live Pi catalog supplied the successful `gpt-5.6-luna` model.
- [technique] Safe provider diagnostics can expose lifecycle stage, model, endpoint, HTTP status, and selected provider error fields while excluding prompts, credentials, tokens, account IDs, headers, and paths.

## Sources Consulted

The accepted [desktop shell and filesystem decision](../decisions/desktop-shell-filesystem.md#evidence-and-sources) contains the exact official Deno, Tauri, Rig, OpenCode, OpenAI, and commit-pinned Pi links used for the decision.

## Remaining Checks

- [risk] Native Open, Save, and Save As dialogs compile into the package but still need a manual packaged click-through.
- [risk] Windows packaging and execution, owner-only credential ACLs, installer formats, architectures, signing, and notarization remain production or release checks.
- [risk] The spike code is retained evidence, not production desktop code. Production must integrate the shared IDE while preserving the opaque document and provider-neutral event boundaries.
