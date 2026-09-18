<!-- ABOUTME: Records direct-file Blob-worker compatibility evidence for the standalone export spike. -->
<!-- ABOUTME: States the selected isolation strategy and the remaining production implementation work. -->

# Standalone File Worker Evidence

## Status

The standalone artifact runs directly from `file://` in Chromium, Firefox, and WebKit. Each engine creates Blob workers, replaces an active worker after source changes, terminates a runaway worker, and receives Canvas commands, diagnostics, runtime errors, and output as plain data.

## Environment

| Component        | Version                 |
| ---------------- | ----------------------- |
| Chromium         | `151.0.7922.34`         |
| Firefox          | `153.0`                 |
| WebKit           | `26.5`                  |
| Operating system | macOS `26.6.2`, `arm64` |

## Observations

| Criterion | Result | Evidence |
| --- | --- | --- |
| Direct `file://` artifact | Pass | Each engine navigates directly to `index.html` with no server |
| Blob worker creation | Pass | Each source run creates a worker from an inline Blob URL |
| Debounced replacement | Pass | A later blue draw remains visible after an earlier delayed red draw is replaced |
| Timeout termination | Pass | A runaway worker produces a visible timeout and the next run renders |
| Plain worker data | Pass | Commands, diagnostics, runtime errors, and output entries render from worker messages |
| Network isolation | Pass | The verifier records no non-`file:`, non-`blob:`, or non-`data:` request |

## Recommendation

Use an inline JavaScript Blob worker for standalone HTML export. The production artifact should create a Blob worker for each preview run, revoke its Blob URL after worker construction, and terminate the current worker on replacement or timeout.

This spike proves the isolation strategy only. Slice 10 still needs a production export that embeds the GIC core and renders the real `Command[]` protocol.
