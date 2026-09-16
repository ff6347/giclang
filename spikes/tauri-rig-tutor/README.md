# Tauri + Rig Tutor Provider Spike

This is a disposable viability spike for issue `24b7ffb`. It is deliberately outside the application package and has no imports from GIC production code.

`crates/tutor-core` owns the provider-neutral, serializable event protocol. The Tauri command accepts only a question, starts a provider after that explicit submission, and emits those events. The webview consumes `ui/src/bridge.ts`; it does not receive provider objects, credentials, paths, shell access, or an environment API.

## Deterministic verification

```sh
./scripts/verify.sh
```

This requires neither a provider account nor a credential. It tests streaming, cancellation, normalized failures, and that construction alone cannot invoke a provider.

## Packaged-app verification

```sh
pnpm --dir ui install --frozen-lockfile
pnpm --dir ui build
cargo tauri build --config src-tauri/tauri.conf.json
```

The package consumes `ui/dist`; it does not start Vite.

## Explicit live harnesses

No live call is made by any build or deterministic test. After a human has provided authorization in their own terminal, use exactly one command:

```sh
GIC_ALLOW_LIVE=1 ./scripts/live-opencode.sh
GIC_ALLOW_LIVE=1 GIC_TUTOR_AUTH_FILE="$HOME/Library/Application Support/GIC/auth.json" ./scripts/chatgpt-device-login.sh
```

The OpenCode command refuses a missing confirmation or empty environment variable. Do not paste a key into chat, source, command history, or a file. The ChatGPT command displays a device URL/code and makes one tiny completion request after human authorization. Re-run it to test reload/refresh. To sign out, run it with `GIC_SIGN_OUT=1`; do not claim login or refresh passed until a human has run those explicit checks.
