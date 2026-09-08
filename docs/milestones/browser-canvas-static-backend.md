<!-- ABOUTME: Plans the browser Canvas adapter for one-shot static GIC sketches. -->
<!-- ABOUTME: Keeps browser concerns outside the platform-neutral interpreter and render core. -->

# Browser Canvas Backend for Static Sketches

## Learning Goal

Adapt recorded/backend drawing operations to browser Canvas for one-shot rendering.

## Prerequisites

- [Render backend interface and command model](render-backend-interface-command-model.md) milestone.
- [Recording backend and drawing built-ins](recording-backend-drawing-built-ins.md) milestone.
- [Interpreter setup and loop lifecycle](interpreter-setup-loop-lifecycle.md) for static programs.
- Basic familiarity with Canvas 2D context operations.

## Concepts to Understand

- The Canvas backend is an adapter, not a new interpreter.
- Core runtime and backend command types should remain DOM-free.
- Canvas state changes must follow command order.
- Static sketches render once after the program produces drawing commands or while commands are applied.

## Relevant Specification Links

- `../Language specification.md#canvas`
- `../Language specification.md#colors`
- `../Language specification.md#shape-style`
- `../Language specification.md#shape-drawing`
- `../Language specification.md#static-programs`

## Existing Code Context

- The recording backend should already prove command order and shape data.
- Browser Canvas animation is a later adapter over the same command vocabulary.
- Platform-neutral core modules must not import DOM or Canvas APIs; DOM typings belong only in adapter-facing files.

## Included

- Browser Canvas context adapter for static rendering.
- Logical canvas size `101 x 101`.
- Full-canvas background behavior.
- Mapping for all supported shape commands.
- Style state application to later shapes.
- Documented color handling.
- Static render-once lifecycle.
- Real Firefox Canvas pixel tests.

## Non-Goals

- Animation scheduling.
- Runtime drawing built-in semantics already covered by recording backend tests.
- Pixel-perfect visual regression suite.
- DOM creation policy beyond accepting or adapting a context.
- Letting DOM typings leak into platform-neutral core.

## Runtime/Backend Boundary Shape

The browser adapter should translate backend commands to a Canvas-like context only:

```txt
CanvasStaticAdapter
  render(commands, context)
```

Core interpreter and command model modules should not import browser DOM types. If TypeScript needs DOM types, keep them in adapter-facing files.

## Canvas Command Mapping

- Logical size is `101 x 101` unless a later canvas-size decision changes it.
- `background` should cover the full logical canvas.
- Shape commands map to Canvas path or fill/stroke calls.
- Style commands affect only later shapes.
- Command order remains the source of truth.

## Color Handling

Document how boundary color data becomes Canvas fill and stroke styles. If OKLCH conversion is not yet decided, keep this adapter explicit about what it accepts and what remains gated.

## Static Render Lifecycle

A static program should execute once and render once. Tests can either feed command records directly to the adapter or run a small program through the recording/backend seam before applying commands.

## TDD-Oriented Student Checklist

- Logical canvas size is `101 x 101`.
- `background` fills the full canvas.
- All supported shapes map to Canvas operations.
- Style state affects later shapes.
- Color handling is documented.
- Static sketches render once.
- Real Firefox Canvas tests cover command translation without mocking Canvas.
- Platform-neutral core remains DOM-free.

## Verification

- Use Playwright with Firefox through the real preview UI.
- Assert visible background, style, and shape behavior from Canvas pixels.
- Include an import-boundary check if tooling supports it.
- Keep interpreter command semantics in core tests rather than duplicating them
  in browser assertions.

## Resolved Decisions and Constraints

- Playwright with Firefox exercises the real browser Canvas preview.
- The adapter converts tagged OKLCH values to Canvas styles and passes validated
  CSS colors through.
- DOM typings remain isolated from the platform-neutral core.
- The adapter consumes the recorded ordered `Command[]` after static execution.

## Notes

Canvas adapters should only translate backend commands to browser APIs. If a test needs interpreter semantics, place that expectation in earlier runtime or recording-backend milestones.
