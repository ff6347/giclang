# Electron Application and Pi Boundary Spike

This directory contains disposable evidence for git-bug issue `421132b`. It is not production application code.

## Questions

- Can Electron launch packaged GIC assets without a development server?
- Can the renderer remain sandboxed and free of Node.js access?
- Can native document operations stay behind a narrow preload API?
- Can the minimal Pi libraries run and stream in the privileged Node.js process?
- Does Electron remove the need for a tutor sidecar?

## Process boundary

The renderer uses `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. Its preload exposes only:

- `documents.open()`, `documents.save(id, source)`, and `documents.saveAs(source)`;
- `tutor.probe(mode)`, `tutor.cancel()`, and `tutor.onChunk(callback)`; and
- `completeProbe()` for packaged-spike lifecycle evidence.

The renderer receives no Electron IPC object, Node.js module loader, filesystem path, shell operation, environment variable, or credential value. Native paths stay in a process-local document store and are represented by opaque IDs.

The main process imports `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core` directly. It does not install or embed `pi-coding-agent`, Pi tools, a shell, or a sidecar.

## Verification

```sh
pnpm install --frozen-lockfile
pnpm verify
```

The verifier runs deterministic document and Pi tests, validates the sandbox/preload boundary, packages a macOS application, launches its bundled executable, and requires stream, cancellation, IPC, and close-lifecycle evidence.

Native Open and Save dialogs remain manual UI checks. Real Codex and OpenCode login checks require explicit credentials and are not part of deterministic automation.
