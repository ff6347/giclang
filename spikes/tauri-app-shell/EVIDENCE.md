# Tauri Application Shell Evidence

## Status

**Positive for the static application shell, with two remaining platform checks.**

Tauri packaged and launched the static spike without a development server or companion process. The packaged web asset invoked Rust, received a Rust event, acknowledged it, and closed through the application lifecycle. Rust tests proved the restricted document adapter. Native dialogs compile into the package and use Tauri's supported dialog plugin, but automated macOS UI interaction was unavailable, so clicking Open and Save As remains a manual check. Windows packaging remains a real-Windows check.

## Environment

| Component               | Version                                    |
| ----------------------- | ------------------------------------------ |
| Tauri CLI               | `2.11.4`                                   |
| Tauri crate             | `2.11.5`                                   |
| Tauri build crate       | `2.6.3`                                    |
| Tauri dialog plugin     | `2.7.3`                                    |
| Tauri Wry runtime       | `2.11.4`                                   |
| Wry                     | `0.55.1`                                   |
| Rust                    | `rustc 1.91.1 (ed61e7d7e 2025-11-07)`      |
| Cargo                   | `1.91.1 (ea2d97820 2025-10-10)`            |
| Webview                 | System WKWebView / WebKit `21624.5.1.11.3` |
| Operating system        | macOS `26.6.2` build `25G83`               |
| Kernel and architecture | Darwin `25.6.0`, `arm64`                   |

The unsigned `.app` is 8.5 MB and contains one executable: `Contents/MacOS/gic-tauri-spike`.

## Observations

| Criterion                                        | Result               | Evidence                                                                           |
| ------------------------------------------------ | -------------------- | ---------------------------------------------------------------------------------- |
| Built assets launch without a development server | Pass                 | Direct bundled-binary launch records `rust-setup` and `webview-ready`.             |
| Webview-to-Rust command callback                 | Pass                 | Packaged `app.js` records `webview-ready`.                                         |
| Rust-to-webview event callback                   | Pass                 | Rust emits `shell-probe`; packaged JavaScript records `probe-event-received`.      |
| Close lifecycle callback                         | Pass                 | Packaged JavaScript requests close and Rust records `close-requested`.             |
| Native Open picker                               | Manual check remains | `open_gic` uses the packaged Rust dialog plugin; UI automation was unavailable.    |
| Native Save/Save As picker                       | Manual check remains | `save_gic_as` uses the packaged Rust dialog plugin; UI automation was unavailable. |
| Restricted document round-trip                   | Pass                 | Two Rust tests cover opaque-ID open/save and unknown-ID rejection.                 |
| macOS package                                    | Pass                 | `src-tauri/target/release/bundle/macos/GIC Tauri Spike.app` launches directly.     |
| Windows package                                  | Not run              | Requires Windows MSVC, WebView2, and a real package smoke test.                    |

The successful packaged evidence sequence was:

```jsonl
{"event":"rust-setup"}
{"event":"webview-ready"}
{"event":"probe-event-received"}
{"event":"close-requested"}
```

## Privilege boundary

- Only the six commands listed in `README.md` are registered.
- The webview has `core:default` capability and no dialog, filesystem, or shell plugin permissions.
- Native dialog paths are consumed in Rust and replaced by process-local opaque document IDs.
- `save_gic` accepts an ID and source, not a filesystem path.
- The CSP permits only packaged assets; the spike makes no network request.

This is narrower than exposing Tauri's filesystem plugin with user-selected path scopes. Production can preserve this adapter shape while replacing process-local IDs with the accepted document model.

## Windows work remaining

Tauri supports MSI packages through WiX and setup executables through NSIS. MSI creation requires a Windows host; Tauri's cross-compiled NSIS path is explicitly a last resort. The release check should therefore use a Windows runner with:

- the Microsoft C++ Build Tools and Windows SDK;
- the MSVC Rust target;
- WebView2 availability or installer bootstrapping;
- a native Open/Save/Save As round-trip; and
- installation, launch, replacement, signing, and uninstall evidence.

## Sidecar decision

The static authoring shell needs no Node sidecar. Tauri embeds the shared built assets, while the operation-specific Rust bridge owns native dialogs and files.

The optional tutor remains an independent risk. Test Pi streaming and Codex/OpenCode authentication against Tauri's Rust/webview boundary first. Add a bundled Node SEA sidecar only if those provider libraries cannot run in the webview and a narrow Rust implementation is not reasonable. The static editor must continue to launch and work when that optional process is absent.

## Decision gate

Proceed with Tauri as the preferred production-shell candidate instead of Electron. Before recording the architecture decision as final:

1. manually complete the packaged macOS native-dialog round-trip;
2. run the same package and dialog smoke test on Windows; and
3. spike the optional Pi/provider boundary without coupling it to static authoring.
