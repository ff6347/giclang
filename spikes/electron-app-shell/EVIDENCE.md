# Electron Application and Pi Boundary Evidence

## Status

Electron packaged and launched the static spike without a development server or sidecar. The packaged renderer invoked the maintained Pi AI and agent-core libraries in Electron's main process, received streamed chunks over the restricted preload bridge, cancelled a second stream, acknowledged the callback, and closed through the application lifecycle.

The result proves that Electron can host the minimal Pi provider stack directly. It does not prove real Codex or OpenCode authentication because those checks need explicit credentials, nor does it prove native dialog interaction or Windows packaging.

## Environment

| Component               | Version                                |
| ----------------------- | -------------------------------------- |
| Electron                | `44.4.0`                               |
| Electron Packager       | `20.3.0`                               |
| Pi AI                   | `@earendil-works/pi-ai 0.85.1`         |
| Pi agent core           | `@earendil-works/pi-agent-core 0.85.1` |
| Bundled Chromium        | `152.0.7977.78`                        |
| Bundled Node.js         | `24.21.0`                              |
| Bundled V8              | `15.2.124.19-electron.0`               |
| Operating system        | macOS `26.6.2` build `25G83`           |
| Kernel and architecture | Darwin `25.6.0`, `arm64`               |

The unsigned `.app` is 365 MB. In addition to its main executable, it contains Electron's renderer, GPU, and plugin helpers, the Electron framework, update frameworks, crash handler, and bundled native libraries.

## Observations

| Criterion | Result | Evidence |
| --- | --- | --- |
| Packaged assets without a development server | Pass | The verifier launches the packaged executable directly |
| Sandboxed, context-isolated renderer | Pass | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` |
| Narrow preload API | Pass | Static checks reject privileged renderer access; preload exposes operation-specific methods |
| Restricted document round-trip | Pass | Node tests prove opaque document IDs and reject unknown IDs |
| Native Open/Save dialogs | Unproven manually | Electron dialog calls and `.gic` filters are packaged, but no UI automation clicked them |
| Minimal Pi libraries in the main process | Pass | Packaged evidence records two Pi module probes without `pi-coding-agent` or a sidecar |
| Deterministic Pi streaming | Pass | Exact Socratic response chunks cross main-to-renderer IPC |
| Pi cancellation | Pass | A slow deterministic stream ends with `stopReason: "aborted"` |
| Close lifecycle | Pass | Packaged evidence records renderer callback and close request |
| macOS package | Pass | Unsigned arm64 `.app` packaged and launched on the recorded host |
| Windows package | Not run | Requires a real Windows runner |
| Real provider authentication | Not run | Requires explicit Codex/OpenCode credentials and provider-specific smoke checks |

The spike uses the maintained `@earendil-works` successor packages rather than the deprecated `@mariozechner` package line. The renderer never receives Node.js, Electron IPC, filesystem paths, environment variables, or credentials. Native paths remain in the main process behind opaque IDs.

## Recommendation

Keep Tauri as the preferred production shell for static authoring. Its spike produced an 8.5 MB application with one executable, while Electron produces a 365 MB multi-process application and adds a broader security and update surface.

Keep Electron as the provider-compatibility fallback. It is the lowest-risk way to embed the Pi Node.js libraries without a sidecar, and this spike proves their stream and cancellation lifecycle in a packaged app. Before committing to Tauri, run a focused Pi authentication and streaming spike across its Rust/webview boundary. Choose Electron only if supporting Pi in Tauri requires a fragile provider port or a sidecar whose lifecycle and packaging cost outweigh Electron's size and security tradeoffs.
