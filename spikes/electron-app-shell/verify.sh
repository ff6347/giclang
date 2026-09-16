#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
evidence="$root/evidence.jsonl"

rm -f "$evidence"
pnpm --dir "$root" test

for setting in 'contextIsolation: true' 'nodeIntegration: false' 'sandbox: true'; do
	if ! grep -q "$setting" "$root/main.js"; then
		echo "Missing renderer boundary setting: $setting" >&2
		exit 1
	fi
done

for forbidden in 'require(' 'process.' 'ipcRenderer' 'node:'; do
	if grep -R -q "$forbidden" "$root/web"; then
		echo "Renderer contains forbidden privileged access: $forbidden" >&2
		exit 1
	fi
done

if grep -q 'pi-coding-agent' "$root/package.json"; then
	echo "The spike must use minimal Pi libraries, not pi-coding-agent." >&2
	exit 1
fi

pnpm --dir "$root" package:mac

app_path="$root/dist/GIC Electron Spike-darwin-arm64/GIC Electron Spike.app"
binary="$app_path/Contents/MacOS/GIC Electron Spike"
if [[ ! -x "$binary" ]]; then
	echo "Packaged application binary not found: $binary" >&2
	exit 1
fi

GIC_ELECTRON_SPIKE_EVIDENCE="$evidence" "$binary" &
pid=$!

for _ in {1..600}; do
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

for event in main-ready pi-modules-imported pi-stream-complete pi-stream-cancelled renderer-callback-complete close-requested; do
	if ! grep -q "\"event\":\"$event\"" "$evidence"; then
		echo "Missing packaged evidence event: $event" >&2
		exit 1
	fi
done

cat "$evidence"
