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

ChatGPT device authorization is a narrow GIC-owned privileged port because Rig 0.42's public OAuth API begins device authentication only during its first completion stream. **Sign in with ChatGPT** therefore calls only the inspectable OpenAI Codex device-code, authorization-poll, and token endpoints: it displays the real verification URL and one-time code, polls for authorization, and stores the minimum private token record at the Rust-selected app config path. No provider/model completion is started until **Send**. On Send (including after restart), the port reloads or refreshes that record and gives its in-memory access token and account ID to Rig's real ChatGPT/Codex streaming client using `gpt-5.5`, the current recommendation in OpenAI's [Codex model documentation](https://developers.openai.com/codex/models). **Sign out** deletes the app-owned record. The path, tokens, raw authentication responses, secrets, account ID, and request headers never cross the webview or logs. The no-argument authorization-page action can open only the exact active verification URL supplied by the device response.

The webview has a small named bridge: no credential storage, filesystem, shell, environment, generic IPC, generic provider configuration, or arbitrary URL opening. Its selectable diagnostic log records UI and Rust lifecycle stages, model and endpoint names, whether an account ID was available, HTTP status, and whitelisted provider error fields. It records prompt length rather than prompt text and excludes credentials, tokens, account IDs, headers, paths, and raw authentication data. No validation command makes a provider call.

The live OpenCode path passed human validation. ChatGPT device authentication passed, but its first completion request failed; use the packaged UI's diagnostic log to identify the provider rejection without weakening the credential boundary.

The [official Zen documentation](https://opencode.ai/docs/zen/) is the source for the selected free model and endpoint. OpenCode Go is a separate paid subscription provider and is not used by this spike.

```sh
./scripts/verify.sh
pnpm --dir ui typecheck
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
```
