<!-- ABOUTME: Describes the disposable direct-file Blob-worker compatibility spike. -->
<!-- ABOUTME: Identifies its scope, artifact behavior, and deterministic verification command. -->

# Standalone File Worker Spike

This directory contains disposable evidence for git-bug issue `c623f0d`. It is not production export code.

## Question

Can one HTML artifact opened directly through `file://` create, replace, and terminate Blob workers without a server or network request in Chromium, Firefox, and WebKit?

## Artifact

`index.html` contains its worker program as an inline JavaScript string. It creates a Blob URL for each run, starts a worker from that URL, then revokes the URL. Source edits wait 100 ms, terminate the active worker, and only accept messages from the current worker.

The worker sends only structured-clone-safe result data:

- drawing commands;
- source-located diagnostics;
- a runtime error; and
- ordered output entries.

The page renders those results and clears stale Canvas output on every expected failure. The `loop` fixture proves timeout termination without blocking the page.

## Verification

```sh
node --test spikes/standalone-file-workers/verify.test.mjs
```

The test opens the artifact directly through `file://` in Chromium, Firefox, and WebKit. It verifies Canvas, diagnostics, runtime error, structured output, replacement behavior, timeout recovery, and the absence of network requests.
