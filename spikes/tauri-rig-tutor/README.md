# Tauri + Rig Tutor Provider Spike

This isolated spike is the packaged, user-facing Tauri UI verification path for issue `24b7ffb`; it imports no production GIC code. Shell examples were removed.

## Packaged UI workflow

```sh
pnpm --dir ui install --frozen-lockfile
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
open target/release/bundle/macos/GIC\ Tutor\ Rig\ Spike.app
```

The packaged UI calls the real Rig providers. The spike selects Zen's current free `mimo-v2.5-free` model through its OpenAI-compatible `/chat/completions` protocol and sends a stable, app-generated `x-opencode-session` header for its one UI conversation. A password field sends its key only after **Connect / Save**, immediately clears, and is held only in privileged Rust memory. Enter a prompt, select a provider's **Send**, and use **Cancel** to terminate the active stream.

ChatGPT uses Rig's device flow immediately after **Sign in with ChatGPT**. Rig supplies the verification URL and one-time user code; the restricted no-argument authorization-page action can open only that active-flow URL. Rig owns the token-record writes in an application-owned platform config directory selected in Rust. The path and tokens never cross the webview. The record is reused after restart and **Sign out** removes it. Rig's persistence implementation owns write and permission behavior, so this spike makes no unsupported atomic-write or `0600` guarantee.

The webview has a small named bridge: no credential storage, filesystem, shell, environment, generic IPC, generic provider configuration, or arbitrary URL opening. No validation command makes a provider call.

Live OpenCode and ChatGPT outcomes remain deliberately unrun: test them only by interacting with the packaged UI.

The [official Zen documentation](https://opencode.ai/docs/zen/) is the source for the selected free model and endpoint. OpenCode Go is a separate paid subscription provider and is not used by this spike.

```sh
./scripts/verify.sh
pnpm --dir ui typecheck
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
```
