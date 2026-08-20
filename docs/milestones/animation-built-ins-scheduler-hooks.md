<!-- ABOUTME: Defines animation runtime built-ins and test scheduler seams for GIC. -->
<!-- ABOUTME: Documents frame state without introducing browser timers or Canvas implementation. -->

# Animation Built-ins and Scheduler Hooks

## Learning Goal

Expose frame state and scheduler seams without browser timers.

## Prerequisites

- [Interpreter setup and loop frame lifecycle](interpreter-setup-loop-lifecycle.md) milestone.
- [Pure built-in registry](pure-math-print-randomness-built-ins.md), read-only constant behavior, and runtime guard pattern.
- [Recording render backend](recording-backend-drawing-built-ins.md) if frame drawing needs observable commands.
- [Built-in call errors](semantic-built-in-call-errors.md) as complementary static diagnostics when analyzer support is available.

## Concepts to Understand

- Frame state belongs to the runtime lifecycle, not to the parser.
- Animation built-ins should use the same runtime callable and guard pattern as pure built-ins.
- A scheduler can be tested with manual start, step, and stop operations.
- Browser timers are adapters over the scheduler seam, not the core scheduler design.
- Rendering per frame should be observable without implementing Canvas.

## Relevant Specification Links

- `../Language specification rev 2.2.md#animation`
- `../Language specification rev 2.2.md#animated-programs`
- `../Language specification rev 2.2.md#animation-built-ins`
- `../Language specification rev 2.2.md#constants`
- `../Language specification rev 2.2.md#implementation-architecture`

## Existing Code Context

- Program lifecycle should expose testable setup and single-frame execution.
- Built-in constants already establish read-only name behavior.
- Browser Canvas animation backend comes later and should depend on this seam.

## Included

- Runtime frame state object or equivalent.
- `frameCount` read-only value.
- `frameRate` built-in or setting hook.
- Default fps of 60.
- Runtime errors for invalid fps values through the pure built-in guard pattern.
- Test scheduler with start, step, and stop behavior.
- Observable frame drawing through the current backend seam.

## Non-Goals

- Browser `requestAnimationFrame` adapter.
- Canvas rendering.
- Real-time drift correction.
- Automatic frame clearing or background insertion.
- Static analyzer implementation for animation built-in names beyond complementary diagnostics already available.

## Runtime/Backend Boundary Shape

Frame state and scheduler control should be injectable and testable:

```txt
FrameState
  frameCount
  targetFps
```

The scheduler should drive the interpreter lifecycle one frame at a time and should not know how Canvas commands are rendered.

## Frame State Semantics

- `frameCount` starts at `0`.
- It increments once per executed frame.
- It is read-only from GIC code.
- The default target frame rate is 60 fps.
- Invalid frame rates report runtime errors; semantic diagnostics may catch obvious static cases but do not replace runtime guards.

Document whether `frameCount` is observed before or after increment within a frame before writing exact assertions.

## Test Scheduler Hooks

A test scheduler should support starting, stepping frames manually, and stopping. Once stopped, it should prevent later frames until explicitly restarted according to the chosen lifecycle policy.

## Drawing Observability

When a loop body draws, tests should be able to observe per-frame backend commands. Whether commands accumulate or are grouped by frame should be documented by the backend/lifecycle boundary.

## TDD-Oriented Student Checklist

- `frameCount` starts at 0.
- `frameCount` increments once per frame.
- `frameCount` is read-only.
- Default fps is 60.
- Invalid fps values report runtime guard errors.
- Test scheduler can start, step, and stop.
- Stopped animation prevents later frames.
- Frame drawing is observable through the backend seam.

## Verification

- Drive frames with a fake scheduler, not real timers.
- Assert frame state across multiple manual steps.
- Test invalid `frameRate` inputs through normal built-in calls and the pure runtime guard path.
- Include one loop body that draws and assert frame-visible commands.

## Gates and Open Questions

- Static-program `frameCount` behavior is unresolved.
- FPS limits and drift policy are unresolved.
- Current-frame versus next-frame effect of `frameRate` is unresolved.
- Decide whether restart resumes or resets state before browser adapter work.

## Notes

This milestone should leave browser scheduling boring: later adapters translate real time into the same tested scheduler hooks.
