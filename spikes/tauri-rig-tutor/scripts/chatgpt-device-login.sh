#!/bin/sh
set -eu
: "${GIC_ALLOW_LIVE:?Set GIC_ALLOW_LIVE=1 only after explicit authorization.}"
: "${GIC_TUTOR_AUTH_FILE:?Set an app-owned, uncommitted auth.json path.}"
[ "$GIC_ALLOW_LIVE" = "1" ] || { echo "Refusing device login: GIC_ALLOW_LIVE must equal 1." >&2; exit 2; }
exec cargo run --manifest-path src-tauri/Cargo.toml --example chatgpt-device-login
