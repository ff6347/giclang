#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
grep -Fq '"core:event:allow-listen"' src-tauri/capabilities/tutor-events.json
cargo test --workspace
cargo check --workspace
pnpm --dir ui install --frozen-lockfile
pnpm --dir ui build
