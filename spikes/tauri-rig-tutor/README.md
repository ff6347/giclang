# Tauri + Rig Tutor Provider Spike

This isolated spike is the packaged, user-facing Tauri UI verification path for issue `24b7ffb`; it imports no production GIC code. Shell examples were removed.

## Packaged UI workflow

```sh
pnpm --dir ui install --frozen-lockfile
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
open target/release/bundle/macos/GIC\ Tutor\ Rig\ Spike.app
```

The app labels OpenCode Zen's documented-free `mimo-v2.5-free` model. A password field sends its key only after **Connect / Save**, immediately clears, and is held only in privileged Rust memory. Enter a prompt, select a provider's **Send**, and use **Cancel** to stop it. ChatGPT uses **Sign in with ChatGPT**, the restricted no-argument authorization-page action, and **Sign out**.

The webview has a small named bridge: no credential storage, filesystem, shell, environment, generic IPC, generic provider configuration, or arbitrary URL opening. No validation command makes a provider call.

```sh
./scripts/verify.sh
pnpm --dir ui typecheck
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
```
