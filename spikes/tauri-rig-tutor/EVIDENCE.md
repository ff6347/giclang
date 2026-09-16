# Evidence: Tauri + Rig Tutor Provider Spike

Status: deterministic protocol and packaged-app build are in progress; **no provider login or paid request has been made**.

## Scope and boundary

The test application is an isolated Cargo workspace. It has no production GIC imports. Its webview can only call a local typed `submit`/`cancel` bridge and receive serializable `text`, `complete`, `cancelled`, or `error` events. It has no credential, filesystem, shell, path, or environment capability. Rig types remain inside Rust and are absent from the event and TypeScript contract.

Provider execution is only reachable from a nonempty explicit submission. The deterministic provider provides the contract test seam; it makes no network calls.

## Versions and host

| Item | Value |
| --- | --- |
| Host | macOS 26.6.2 (25G83), Darwin 25.6.0, arm64 |
| Rust | rustc/cargo 1.91.1 |
| Node / pnpm | 26.7.0 / 12.3.4 |
| Tauri Rust crate | declared 2.9.5, resolved 2.11.5 (pending package build) |
| Rig | `rig-core` 0.42.0 |
| Webview | Tauri/Wry on macOS uses the operating-system WKWebView |
| Existing Electron evidence | Electron 44.4.0, Chromium 152.0.7977.78, Node 24.21.0 (`spikes/electron-app-shell/evidence.jsonl`) |
| Existing Tauri-shell evidence | only `{"event":"rust-setup"}`; it establishes no runtime/package result |

## Rig source inspection

The locally downloaded `rig-core` 0.42.0 source exposes `providers::chatgpt::Client::builder().oauth()`, `on_device_code`, `allow_device_flow`, and `auth_file`; it documents its subscription endpoint as `https://chatgpt.com/backend-api/codex` and has Codex model constants. This supports an app-owned device-prompt/auth-file integration without token serialization. The live harness wires the prompt callback and streamed completion to an explicit app-owned `GIC_TUTOR_AUTH_FILE`; a second run is the refresh/reload check and `GIC_SIGN_OUT=1` deletes that file. Atomic writes and platform permissions remain unverified because the Rig-owned auth-file writer is not configurable in this harness.

Rig has no named OpenCode provider in this version. OpenCode's current Zen documentation lists the OpenAI-compatible Responses endpoint `https://opencode.ai/zen/v1/responses`; the adapter therefore sets Rig's OpenAI base URL to `https://opencode.ai/zen/v1` and selects `gpt-5.4-nano`, a listed low-cost curated model. Its explicit live harness is compiled but not run.

## Verification record

| Check | Result |
| --- | --- |
| `cargo fmt --check` | initially reported formatting changes; corrected before rerun |
| deterministic Rust tests | pass: 3 protocol tests |
| Rust check | pass, including both credential-gated live harness binaries |
| UI production build | pass: Vite 7.1.7, `dist/index.html` 0.29 kB and JS 2.22 kB |
| packaged Tauri app | pass: packaged from `ui/dist` without a development server; clean `.app` is 8.0 MB and contains one executable, `Contents/MacOS/gic-tauri-rig-tutor-spike` |
| live OpenCode | not run (no authorization/credential) |
| ChatGPT device login | not run (human flow not authorized/completed) |

## Recommendation

The accepted v0.9 direction remains Deno Desktop first. This spike currently cannot recommend replacing it: Tauri packaging and real provider/auth behavior are not yet evidenced. Rig is a promising narrower native-provider candidate because its ChatGPT device-flow surface exists, but OpenCode needs a confirmed adapter. Reassess after the package and authorized live tests. If a fallback is required, prefer a narrow Rust/Tauri implementation only if macOS and Windows package/auth evidence passes; otherwise Electron has the stronger currently recorded shell-runtime baseline. A Node SEA sidecar adds process/lifecycle complexity and is not justified by current evidence.
