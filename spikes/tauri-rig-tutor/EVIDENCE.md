# Evidence: Tauri + Rig Tutor Provider Spike

Status: deterministic packaged-UI work is ready for validation. No API key, ChatGPT login, provider request, token, raw provider response, or paid request has been made.

The packaged Tauri UI is the only live-test path. OpenCode Zen displays the documented-free `mimo-v2.5-free` model. Its password field crosses only `connect_opencode` after a click, then clears immediately; it is not emitted, rendered, logged, returned, or stored in browser storage. Rust retains it only in memory. Renderer IPC is a small named bridge with no path, shell, environment, provider configuration, or arbitrary URL opener.

ChatGPT/Codex displays `gpt-5.3-instant`. Device authorization is structured non-secret UI state, and its opener takes no renderer URL. This revision does not persist OAuth credentials, avoiding exposed Rig auth-file paths and any unverified atomic-token-write claim. Sign-out clears app authorization state.

| Check | Result |
| --- | --- |
| `cargo fmt --check` | pass |
| `cargo check` / `cargo test` | pass; 4 deterministic core tests |
| `pnpm --dir ui typecheck` / `build` | pass |
| Tauri package without Vite | pass; `target/release/bundle/macos/GIC Tutor Rig Spike.app`, 8.1 MB, one executable |
| packaged app launch without Vite | unrun in this automated session |
| live OpenCode and ChatGPT tests | explicitly unrun; human UI test only |

Prior evidence recorded an 8.5 MB one-executable Tauri package (not the older Tauri-shell spike). Electron's recorded package was 365 MB. Record this revision's artifact path and size after packaging.
