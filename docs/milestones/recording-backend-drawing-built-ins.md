<!-- ABOUTME: Plans deterministic drawing built-ins using a recording render backend. -->
<!-- ABOUTME: Keeps rendering testable before introducing browser Canvas adapters. -->

# Recording Render Backend and Drawing Built-ins

## Learning Goal

Make drawing built-ins testable deterministically without Canvas.

## Prerequisites

- [Render backend interface and command model](render-backend-interface-command-model.md) milestone.
- [Pure built-in](pure-math-print-randomness-built-ins.md) callable dispatch seam and runtime guard pattern for arity/type errors.
- [Built-in call errors](semantic-built-in-call-errors.md) as complementary static diagnostics when analyzer support is available.
- [Interpreter setup/loop lifecycle](interpreter-setup-loop-lifecycle.md) for static programs and [repeat statements](interpreter-repeat-statements.md).

## Concepts to Understand

- A recording backend captures commands rather than drawing pixels.
- Drawing built-ins should be ordinary callables that emit backend commands.
- Runtime arity and type guards should follow the pure runtime built-in pattern.
- Style state affects later shape commands.
- Tests should assert deterministic command lists, not visual screenshots.

## Relevant Specification Links

- `../Language specification rev 2.1.md#canvas`
- `../Language specification rev 2.1.md#colors`
- `../Language specification rev 2.1.md#shape-style`
- `../Language specification rev 2.1.md#shape-drawing`
- `../Language specification rev 2.1.md#testing-strategy`

## Existing Code Context

- The backend interface should already define command records and default style expectations.
- Pure built-ins provide the call-dispatch and runtime guard pattern.
- Repeat statement execution can produce repeated drawing calls in observable order.

## Included

- Recording backend command list.
- Style state tracked by the recording backend or drawing layer.
- Empty initial command list.
- Default style behavior.
- `background` built-in.
- Style built-ins such as fill, stroke, and stroke width.
- Shape built-ins from the specification.
- Color overload handling at the documented boundary level.
- Runtime guards for drawing built-ins that match the pure runtime built-in pattern.
- GIC program tests that assert command records.

## Non-Goals

- Browser Canvas rendering.
- Pixel comparison tests.
- Color-space conversion beyond the boundary decision already made.
- Scheduler or animation timing.
- Analyzer enforcement for drawing argument types beyond complementary static diagnostics already available.

## Runtime/Backend Boundary Shape

The recording backend combines command recording with enough style state to make later shape assertions clear:

```txt
RecordingBackend
  commands
  currentStyle
```

Whether shape commands store style snapshots or rely on prior style commands must be explicit before tests are written.

## Recording Backend Behavior

- Starts with an empty command list.
- Applies documented default style.
- Records every backend command in call order.
- Exposes a read-only snapshot for tests when possible.
- Does not import DOM or Canvas APIs.

## Drawing Built-ins

Drawing built-ins should validate arguments at runtime, translate GIC values into backend command data, and call the backend. They should not decide static legality that belongs to the analyzer; semantic diagnostics are complementary static checks, not a replacement for runtime guards.

Covered families include:

- `background`;
- style calls such as fill and stroke;
- shape calls such as point, line, rect, and circle.

## Program-Level Assertions

Integration-style tests should run small GIC programs and assert the resulting command list. Repeat loops are especially useful for proving drawing order.

## TDD-Oriented Student Checklist

- Initial recording command list is empty.
- Default style is observable or documented in first shape behavior.
- `background` records the expected operation.
- Style built-ins affect later shape commands.
- Shape built-ins record expected geometry.
- Color overloads follow the boundary policy.
- Invalid arity and type errors are runtime guarded through the pure built-in call pattern.
- Whole GIC programs can assert command lists.
- Drawing inside repeat statements preserves iteration order.

## Verification

- Unit-test each built-in with a recording backend.
- Add one static program that combines background, style, and shapes.
- Add one repeat program that draws several commands in predictable order.
- Confirm no browser APIs are imported.

## Gates and Open Questions

- Decide style snapshot versus separate style commands before locking test expectations.
- Color conversion belongs to the earlier boundary or analyzer decision; do not hide it here.
- Multiple `background()` calls must have explicit behavior.

## Notes

This milestone is the bridge between runtime built-ins and visual backends. It should make browser Canvas work a mechanical adapter task later.
