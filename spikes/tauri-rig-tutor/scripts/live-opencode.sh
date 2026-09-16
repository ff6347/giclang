#!/bin/sh
set -eu
: "${GIC_ALLOW_LIVE:?Set GIC_ALLOW_LIVE=1 only after explicit authorization.}"
: "${GIC_OPENCODE_API_KEY:?Set this in your terminal environment; never put it in source or an argument.}"
[ "$GIC_ALLOW_LIVE" = "1" ] || { echo "Refusing live call: GIC_ALLOW_LIVE must equal 1." >&2; exit 2; }
exec cargo run --manifest-path src-tauri/Cargo.toml --example live-opencode
