# Evidence: Tauri + Rig Tutor Provider Spike

Status: the packaged UI is wired to real Rig providers and is ready for human validation. No API key, ChatGPT login, provider request, token, raw provider response, or paid request has been made.

The packaged Tauri UI is the only live-test path. It selects Zen's current free `mimo-v2.5-free` through Rig's OpenAI-compatible `/chat/completions` client and uses a stable app-generated `x-opencode-session` header for the UI conversation. Its password field crosses only `connect_opencode` after a click, then clears immediately; it is not emitted, rendered, logged, returned, or stored in browser storage. Rust retains it only in memory. Renderer IPC is a small named bridge with no path, shell, environment, provider configuration, or arbitrary URL opener.

The current [official Zen documentation](https://opencode.ai/docs/zen/) is the source for the selected free model and `/chat/completions` endpoint. OpenCode Go has distinct models and a paid subscription; it is not used or described as free here.

ChatGPT/Codex displays `gpt-5.3-instant`. A Sign in click starts Rig's actual device flow and Rig supplies the structured non-secret verification URL and user code; its opener takes no renderer URL and accepts no arguments. Rig reads and writes its auth record at an app-owned platform config location selected solely in Rust; neither the location nor tokens are exposed to the renderer. This record is reused on restart and Sign out removes it. Rig owns persistence writes, so atomicity and file-permission guarantees are intentionally not claimed.

| Check | Result |
| --- | --- |
| `cargo fmt --check` | pass |
| `cargo check` / `cargo test` | pass; 5 deterministic adapter-contract tests make no network calls |
| `pnpm --dir ui typecheck` / `build` | pass |
| Tauri package without Vite | pass; `target/release/bundle/macos/GIC Tutor Rig Spike.app`, one executable |
| packaged app launch without Vite | unrun in this automated session |
| live OpenCode and ChatGPT tests | explicitly unrun; human UI test only |

Prior evidence recorded an 8.5 MB one-executable Tauri package (not the older Tauri-shell spike). Electron's recorded package was 365 MB. Record this revision's artifact path and size after packaging.
