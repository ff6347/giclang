<!-- ABOUTME: Documents the shared GIC browser runtime and its build outputs. -->
<!-- ABOUTME: Explains workspace imports, MDX previews, and standalone HTML reuse. -->

# GIC browser runtime

`@giclang/runtime` provides editable GIC previews without Monaco, React, or a
server. It uses `@giclang/core` for language execution and renders the resulting
commands onto Canvas.

## Build

From the repository root:

```sh
pnpm build:runtime
pnpm test:runtime
```

One build compiles the shared core worker and embeds it in both outputs:

- `dist/runtime.js`: ES module with TypeScript declarations, for application imports.
- `dist/runtime.iife.js`: self-contained script for offline standalone HTML,
  available through `@giclang/runtime/standalone`.

Generated bundles are not committed. `pnpm build:site`, `pnpm build:blog`, and
`pnpm build:browser` build their workspace dependencies in order. Rebuild after
changing core or runtime source; development startup builds these dependencies
once, not continuously.

## Use in blog MDX

The blog's component supplies the markup and imports the runtime:

```mdx
import GicCode from "../../components/gic-code.astro";

<GicCode initialCode={'fill("lightpink"); circle(50, 50, 20);'} />
```

Multiple components can appear on one page. Astro bundles their shared client
script once, and each preview keeps its own source, Canvas, output, and
diagnostics.

## Use in browser code

Provide a root containing a `textarea`, a `canvas` with explicit backing dimensions,
and elements marked `data-gic-diagnostics` and `data-gic-output`.

```ts
import { mountPreview } from "@giclang/runtime";

const dispose = mountPreview(root);
// Call dispose when the host removes the preview.
```

The initial source comes from the textarea's value. Typing schedules a run after
100 ms. Each run uses a disposable Blob worker, terminated on completion,
replacement, disposal, or a 500 ms timeout. Only the current worker can update
the preview. Language failures display source-line diagnostics; unexpected worker
failures display a preview failure message.

Alternatively, wrap that markup in `<gic-sketch>` and call
`registerSketchElement()` once in a client-side script. The custom element mounts
on connection and disposes on disconnection. Give it `display: block` in the host's
styles when it should occupy a block.

`renderToCanvas(canvas, commands)` and `clearCanvas(context, canvas)` are also
exported for hosts that manage execution themselves.

The runtime supplies no styles, storage, or remote services. A host Content
Security Policy must permit Blob workers, for example with
`worker-src 'self' blob:`. This is execution isolation and cancellation, not a
general-purpose security sandbox.

## Standalone HTML

The editor copies `@giclang/runtime/standalone` into its generated export assets.
An exported HTML document embeds that same bundle and calls `mountPreview`.
It has no separate interpreter implementation and needs no network requests when
opened through `file://`.
