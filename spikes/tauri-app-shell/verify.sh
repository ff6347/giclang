#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
manifest="$root/src-tauri/Cargo.toml"
evidence="$root/evidence.jsonl"

rm -f "$evidence"

cargo test --manifest-path "$manifest"

commands="$(sed -n '/generate_handler!/,/])/p' "$root/src-tauri/src/lib.rs")"
for expected in open_gic save_gic save_gic_as probe_ready probe_event_received complete_probe; do
	if ! grep -q "$expected" <<<"$commands"; then
		echo "Missing command from explicit allowlist: $expected" >&2
		exit 1
	fi
done

if grep -Eq 'tauri-plugin-(fs|shell)' "$manifest"; then
	echo "The spike must not expose filesystem or shell plugins." >&2
	exit 1
fi

(
	cd "$root"
	pnpm dlx @tauri-apps/cli@2.11.4 build --bundles app
)

binary="$root/src-tauri/target/release/bundle/macos/GIC Tauri Spike.app/Contents/MacOS/gic-tauri-spike"
if [[ ! -x "$binary" ]]; then
	echo "Packaged application binary not found: $binary" >&2
	exit 1
fi

GIC_TAURI_SPIKE_EVIDENCE="$evidence" "$binary" &
pid=$!

for _ in {1..300}; do
	if ! kill -0 "$pid" 2>/dev/null; then
		break
	fi
	sleep 0.1
done

if kill -0 "$pid" 2>/dev/null; then
	kill "$pid"
	wait "$pid" || true
	echo "Packaged application did not complete its lifecycle probe." >&2
	exit 1
fi
wait "$pid"

for event in rust-setup webview-ready probe-event-received close-requested; do
	if ! grep -q "\"event\":\"$event\"" "$evidence"; then
		echo "Missing packaged evidence event: $event" >&2
		exit 1
	fi
done

cat "$evidence"
