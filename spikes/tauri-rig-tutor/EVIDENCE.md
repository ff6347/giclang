# Evidence: Tauri + Rig Tutor Provider Spike

Status: the packaged UI is wired to real Rig providers and needs a second human validation pass. The first pass supplied a valid OpenCode key but produced no visible response, and ChatGPT Sign in disabled the controls without presenting a device code. No successful provider response or ChatGPT login was observed.

The packaged Tauri UI is the only live-test path. It selects Zen's current free `mimo-v2.5-free` through Rig's OpenAI-compatible `/chat/completions` client and uses a stable app-generated `x-opencode-session` header for the UI conversation. Its password field crosses only `connect_opencode` after a click, then clears immediately; it is not emitted, rendered, logged, returned, or stored in browser storage. Rust retains it only in memory. Renderer IPC is a small named bridge with no path, shell, environment, provider configuration, or arbitrary URL opener.

The current [official Zen documentation](https://opencode.ai/docs/zen/) is the source for the selected free model and `/chat/completions` endpoint. OpenCode Go has distinct models and a paid subscription; it is not used or described as free here.

ChatGPT/Codex displays `gpt-5.3-instant`. GIC owns a deliberately narrow device-authorization port because Rig 0.42's public OAuth entry point couples device-flow startup to a completion stream. A Sign in click calls only the inspected Codex device-code, polling, and OAuth-token endpoints; it does not construct or touch a completion/model URL. It displays the response's verification URL and user code, stores only the private token record in the Rust-selected app config path, and deletes it on Sign out. On explicit Send, the adapter reloads/refreshes that record, then passes only its in-memory access token and account ID to Rig's ChatGPT/Codex client for real streaming. Tokens, raw auth responses, secrets, and the auth path are neither emitted, rendered, logged, nor returned. The authorization opener has no renderer URL argument and opens only the exact active response URL.

The first live UI pass exposed three client defects rather than a credential failure. The event listener was not awaited before controls became usable, Rig stream chunks were buffered until completion instead of emitted as they arrived, and OpenAI's production device response encodes `interval` as a JSON string while the port accepted only a number. The replacement build waits for event readiness, emits each text delta immediately, accepts both documented response shapes, adds finite authentication request timeouts, and starts with an explicit `Ready` status.

| Check | Result |
| --- | --- |
| `cargo fmt --check` | pass |
| `cargo fmt --check`, `cargo check` / `cargo test` | pass; five deterministic local HTTP tests cover device request, pending poll, exchange, refresh, redaction, sign-out, and the no-completion-URL invariant |
| `pnpm --dir ui typecheck` / `build` | pass |
| Tauri package without Vite | pass; `target/release/bundle/macos/GIC Tutor Rig Spike.app`, one executable (not launched) |
| packaged app launch without Vite | unrun in this automated session |
| first live OpenCode and ChatGPT UI pass | fail; no visible OpenCode progress and no ChatGPT device code |
| corrected live OpenCode and ChatGPT UI pass | pending human retest |

This revision packaged a 15 MB app at `target/release/bundle/macos/GIC Tutor Rig Spike.app` (not launched). Electron's recorded package was 365 MB.
