<!-- ABOUTME: Defines the unresolved CLI export and server render backend decision gate. -->
<!-- ABOUTME: Compares deferred export, SVG, browser export, Node Canvas, and headless browser rendering without selecting one. -->

# Decision: Optional CLI Export and Server Render Backends

Status: Unresolved

## Decision Question

What optional CLI export and server render backend scope, if any, will GIC
support beyond check/run entry points and browser Canvas execution? This
decision defines whether static or animated export paths such as SVG, PNG, GIF,
browser-driven export, Node Canvas, or headless browser rendering are in scope.

## Current Baseline

- [Memory](../MEMORY.md) treats Node-based image rendering as an optional
  export, CI, or dataset tool rather than the primary execution environment.
- Server rendering remains a candidate only.
- `gic check` and `gic run` must not silently add `gic render`, `gic lsp`,
  PNG/GIF/SVG export, or server rendering.
- Core language packages must remain free of DOM, Node Canvas, Buffer, and
  browser-only types unless an explicit decision changes that boundary.
- Relevant milestones:
  - [Define the render backend interface and command model](../milestones/render-backend-interface-command-model.md)
  - [Add a recording render backend](../milestones/recording-backend-drawing-built-ins.md)
  - [Implement animation built-ins and scheduler hooks](../milestones/animation-built-ins-scheduler-hooks.md)
  - [Add CLI check and run entry points](../milestones/cli-check-run-entry-points.md)
  - [Add example-program and visual-regression verification](../milestones/example-program-visual-regression.md)
- Relevant specification anchors:
  - [Render backends](<../Language specification rev 2.1.md#5-render-backends>)
  - [CLI tool](<../Language specification rev 2.1.md#cli-tool>)
  - [Testing strategy](<../Language specification rev 2.1.md#testing-strategy>)

## Why This Is a Gate

Render backend milestones can define command records and deterministic tests
without committing to export formats or server rendering. This gate prevents
optional output tooling from leaking into the core interpreter, browser backend,
or initial CLI surface before format, dependency, and runtime boundaries are
resolved.

## Options and Consequences

- Option: `Defer all export and server rendering`
  - Consequences: keeps CLI scope limited to check/run and keeps image-format
    dependencies out of core work; leaves visual export, CI image generation,
    and server rendering as candidate-only unresolved areas; requires tests to
    rely on command records or browser smoke paths.
- Option: `SVG static export from command records`
  - Consequences: maps deterministic command records to a text-based static
    format; may fit still sketches better than animation; requires decisions for
    unsupported drawing features, color conversion, and file output behavior.
- Option: `Browser Canvas export from the browser IDE path`
  - Consequences: reuses browser Canvas behavior for exported images or
    recordings; ties export availability to browser APIs and possibly user
    gestures; may not support server or CI use without an additional harness.
- Option: `Node Canvas PNG/GIF server backend`
  - Consequences: can support server-side raster export and CI artifacts;
    introduces Node Canvas dependencies and native installation risks; must not
    pull Buffer, native canvas types, or Node-only APIs into platform-neutral
    core.
- Option: `Headless browser or Playwright render path`
  - Consequences: can exercise the same browser rendering path in automation;
    adds heavier test and runtime dependencies; requires lifecycle rules for
    launch, frame capture, timing, and failure diagnostics.

## Questions Before Choosing

- Are export features required for teaching milestones, examples, CI, datasets,
  or user workflows?
- Which formats matter first: SVG, PNG, GIF, or another artifact?
- Does animation export need deterministic frame scheduling?
- Can command records represent enough drawing behavior for static export?
- What dependency and installation burden is acceptable for optional render
  tooling?
- How are export errors reported without expanding beginner-facing runtime
  complexity?

## Decision Checklist

- Export scope documented as unresolved, included, or excluded for the relevant
  phase.
- Server rendering scope documented separately from browser Canvas runtime.
- CLI command surface documented without implicit `gic render` or `gic lsp`
  expansion.
- Core type boundary documented for DOM, Node Canvas, Buffer, and browser-only
  APIs.
- Format-specific constraints documented for SVG, PNG, GIF, or frame sequences.
- Test strategy documented for any optional render path.

## Unblocks

- Future optional CLI export commands or server render backend implementation if
  selected.
- Future CI image-generation, dataset, PNG/GIF/SVG, or headless-browser artifact
  workflows if selected.

## Related Guidance

- [Memory](../MEMORY.md)
- [Lessons](../LESSONS.md)
- [Define the render backend interface and command model](../milestones/render-backend-interface-command-model.md)
- [Add a recording render backend](../milestones/recording-backend-drawing-built-ins.md)
- [Implement animation built-ins and scheduler hooks](../milestones/animation-built-ins-scheduler-hooks.md)
- [Add CLI check and run entry points](../milestones/cli-check-run-entry-points.md)
- [Add example-program and visual-regression verification](../milestones/example-program-visual-regression.md)
- [Render backends](<../Language specification rev 2.1.md#5-render-backends>)
- [CLI tool](<../Language specification rev 2.1.md#cli-tool>)
- [Testing strategy](<../Language specification rev 2.1.md#testing-strategy>)

## Non-Goals

- Selecting browser IDE technology or sandbox model.
- Selecting desktop shell or filesystem model.
- Adding export commands to the first CLI entry-point milestone by implication.
- Changing render command semantics, language grammar, or runtime semantics.
