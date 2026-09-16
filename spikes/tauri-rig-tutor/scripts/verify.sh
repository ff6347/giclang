#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
cargo test --workspace
cargo check --workspace
pnpm --dir ui install --frozen-lockfile
pnpm --dir ui build
