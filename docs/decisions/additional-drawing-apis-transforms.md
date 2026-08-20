<!-- ABOUTME: Frames the unresolved GIC drawing API and transform decision. -->
<!-- ABOUTME: Records neutral expansion paths for primitives, helpers, and transforms. -->

# Decide Additional Drawing APIs and Transforms

Status: Unresolved

## Decision Question

Should GIC add more drawing primitives, helper variants, or transform functions
beyond the current revision 2.2 shape API?

## Current Baseline

Revision 2.2 defines a fixed 101×101 canvas, style functions, and shape drawing
functions for point, line, rect, circle, ellipse, triangle, quad, and arc. Its
additional considerations ask whether extra shapes such as Bezier curves or
arbitrary polygons are needed and whether transform functions such as rotate,
translate, or scale should exist.

## Why This Is a Gate

Drawing APIs define the render backend command model, recording backend
fixtures, Canvas backend behavior, examples, visual regression coverage, and
reserved built-in names. Stateful transforms in particular change how every
subsequent drawing command is interpreted.

## Options and Consequences

- **No expansion**
  - Keeps the drawing surface aligned with revision 2.2.
  - Requires complex shapes and coordinate reuse to be built from existing
    primitives.
- **Extra primitives**
  - Adds selected primitives such as curves, polygons, or paths if chosen.
  - Requires command-model, backend, and visual-regression updates for each
    primitive.
- **Stateful transforms**
  - Adds transform state such as translate, rotate, scale, and possibly stack
    operations.
  - Introduces ordering and state-reset questions that affect teaching and
    backend implementation.
- **Limited helper variants**
  - Adds convenience functions or modes without a full transform stack.
  - May improve common sketches while creating another category of built-in
    behavior to document.

## Questions Before Choosing

- Which missing drawing operations are needed for early curriculum examples?
- Should transforms be global state like style functions, scoped to blocks, or
  unavailable?
- If transforms exist, is there a stack, reset operation, or per-frame reset
  rule?
- How should angle units interact with arc and trigonometric degree behavior?
- How many backend test fixtures are needed per new primitive or state rule?

## Decision Checklist

- List the exact primitives, helpers, or transform operations in scope.
- Define signatures, coordinate conventions, and state behavior.
- Update the render command model before backend implementations depend on it.
- Add recording backend expectations for each selected operation.
- Add Canvas backend and visual-regression coverage after command behavior is
  stable.
- Update built-in reserved-name data for any new functions.

## Unblocks

- Future implementation milestones for any selected extra primitives, helper
  variants, or transform operations.
- Future backend fixtures and visual-regression coverage for selected drawing
  API expansion.

## Related Guidance

- [Canvas](<../Language specification rev 2.2.md#canvas>)
- [Shape Drawing](<../Language specification rev 2.2.md#shape-drawing>)
- [Additional Considerations](<../Language specification rev 2.2.md#additional-considerations>)
- [Render backend interface milestone](../milestones/render-backend-interface-command-model.md)
- [Recording backend milestone](../milestones/recording-backend-drawing-built-ins.md)
- [Browser Canvas static backend milestone](../milestones/browser-canvas-static-backend.md)

## Non-Goals

- Adding typography, image loading, 3D rendering, or interactivity.
- Selecting a browser IDE technology.
- Implementing backend code.
- Changing the 101×101 canvas baseline.
