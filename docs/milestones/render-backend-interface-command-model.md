<!-- ABOUTME: Defines the platform-neutral rendering boundary for GIC before Canvas integration. -->
<!-- ABOUTME: Specifies command records, style data, ordering, and fake backend expectations. -->

# Render Backend Interface and Command Model

## Learning Goal

Define a platform-neutral rendering boundary before implementing drawing.

## Prerequisites

- [Runtime value model](runtime-value-environment-errors.md) for numbers, strings, and booleans.
- [Pure built-in](pure-math-print-randomness-built-ins.md) call dispatch seam.
- Basic understanding that core interpreter code must run without DOM or Canvas.

## Concepts to Understand

- The interpreter should emit drawing intent, not call browser APIs directly.
- A backend interface lets tests observe rendering without pixels.
- Commands are ordered records of operations.
- Style state and drawing commands need clear default behavior.

## Relevant Specification Links

- `../Language specification rev 2.md#canvas`
- `../Language specification rev 2.md#colors`
- `../Language specification rev 2.md#shape-style`
- `../Language specification rev 2.md#shape-drawing`
- `../Language specification rev 2.md#implementation-architecture`

## Existing Code Context

- Runtime built-ins should already be dispatched as callables.
- This lesson comes before drawing built-ins that target a recording backend.
- Browser Canvas adapters must wait until this platform-neutral boundary exists.

## Included

- Render backend interface shape.
- Command record vocabulary for canvas, style, shape, and output operations.
- Color and style data containers at the boundary.
- Fake backend seam for tests.
- Default fill, stroke, and stroke-width documentation.
- Command ordering expectations.

## Non-Goals

- Implementing browser Canvas.
- Importing DOM, `canvas`, or Node Canvas packages.
- Pixel-perfect rendering tests.
- Full color conversion policy.
- Drawing built-in registration.

## Runtime/Backend Boundary Shape

The backend boundary should be small and platform neutral:

```txt
RenderBackend
  apply(command)
  snapshot?()
```

Commands should be serializable records, not browser objects. Core interpreter and built-in code should depend on this interface, not on DOM types.

## Command Model

Represent at least these categories:

- canvas operations, such as logical size or background;
- style operations, such as fill, stroke, and stroke width;
- shape operations, such as points, lines, rectangles, and circles;
- output or metadata operations only if needed by later tests.

Preserve command order exactly as calls occur in the GIC program.

## Style and Color Data

Document defaults before implementing drawing tests. A student should know the initial fill, stroke, and stroke width. Color values may be kept as normalized boundary data or tagged raw input until the color policy is resolved.

## Fake Backend Seam

A fake backend can collect command records and expose them to tests. It should not simulate Canvas pixels or perform browser-specific normalization.

## TDD-Oriented Student Checklist

- Canvas operations can be represented as commands.
- Style operations can be represented as commands.
- Shape operations can be represented as commands.
- Output or metadata operations are represented only when needed.
- Command order is preserved.
- Default fill, stroke, and stroke width are documented.
- Core code imports no DOM or Node Canvas APIs.

## Verification

- Create backend-interface tests with a fake backend or plain command array.
- Assert command records by value.
- Add an import-boundary check if the project has tooling for it.
- Keep browser rendering out of this milestone's tests.

## Gates and Open Questions

- Avoid Node `Buffer` in browser-neutral core unless the project explicitly decides otherwise.
- Color normalization is unresolved.
- Decide whether `background` is a command, a clear operation, or both.

## Notes

This is the rendering equivalent of the runtime value model: later lessons should reuse this vocabulary instead of inventing their own backend seams.
