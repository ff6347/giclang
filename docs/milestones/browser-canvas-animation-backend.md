<!-- ABOUTME: Plans the browser Canvas adapter for animated GIC sketches. -->
<!-- ABOUTME: Connects tested animation lifecycle hooks to requestAnimationFrame without changing core runtime semantics. -->

# Browser Canvas Animation Backend

## Learning Goal

Connect animation lifecycle to browser scheduling through a testable adapter.

## Prerequisites

- [Browser Canvas backend for static sketches](browser-canvas-static-backend.md).
- [Animation built-ins and scheduler hooks](animation-built-ins-scheduler-hooks.md) milestone.
- [Interpreter setup and loop frame lifecycle](interpreter-setup-loop-lifecycle.md) milestone.
- [Render backend command model](render-backend-interface-command-model.md) and [drawing built-ins](recording-backend-drawing-built-ins.md).

## Concepts to Understand

- Browser scheduling is an adapter over tested lifecycle hooks.
- One scheduled frame should correspond to one interpreter frame unless throttling explicitly skips execution.
- Canvas state per frame must be documented rather than guessed.
- Runtime frame errors need an adapter policy and reporting path.

## Relevant Specification Links

- `../Language specification.md#animation`
- `../Language specification.md#animated-programs`
- `../Language specification.md#animation-built-ins`
- `../Language specification.md#canvas`
- `../Language specification.md#implementation-architecture`

## Existing Code Context

- The static Canvas adapter should already translate commands to a Canvas-like context.
- The animation scheduler hook should already support start, step, and stop in tests.
- Core interpreter lifecycle should not depend on browser APIs.

## Included

- `requestAnimationFrame` scheduler adapter.
- Fake scheduler seam for tests.
- Per-frame interpreter execution.
- `frameRate` throttling behavior.
- Stop and restart behavior.
- Canvas state policy per frame.
- Frame error reporting through callback or documented path.

## Non-Goals

- Changing expression, statement, or drawing built-in semantics.
- Implementing a new render command vocabulary.
- Automatic clearing unless explicitly chosen.
- Pixel-perfect animation tests.
- Real browser harness selection beyond adapter boundaries.

## Runtime/Backend Boundary Shape

The browser animation adapter should wrap browser frame callbacks and drive the already-tested lifecycle:

```txt
AnimationAdapter
  start()
  stop()
  restart()
```

The adapter may use `requestAnimationFrame`, but core runtime, scheduler interfaces, and command models should stay browser-neutral.

## RequestAnimationFrame Scheduling

- Schedule frames through an injectable wrapper so tests can fake time.
- Run one interpreter frame per scheduled frame after throttling decisions.
- Respect `frameRate` according to the policy chosen in the animation built-ins milestone.
- Cancel pending frames when stopped.

## Per-Frame Rendering

Each executed frame should produce or apply drawing commands through the existing backend seam. Document whether commands are cleared, grouped, replayed, or accumulated between frames.

Background clearing should remain controlled by user code unless the project explicitly chooses automatic clearing.

## Stop, Restart, and Error Behavior

- Stopping should prevent later scheduled frames.
- Restarting should avoid duplicate active timers.
- Frame errors should report through a callback or documented error path.
- Decide whether an error stops animation or allows later frames before implementing browser behavior.

## TDD-Oriented Student Checklist

- Fake scheduler seam can drive adapter tests.
- One interpreter frame runs per scheduled frame after throttling.
- `frameRate` throttling is respected.
- Stop cancels or prevents later frames.
- Restart avoids duplicate timers.
- Canvas state per frame is documented.
- Frame errors use a callback or documented reporting path.

## Verification

- Test with fake `requestAnimationFrame` and fake cancel functions.
- Assert lifecycle calls rather than waiting for real time.
- Include stop and restart tests that would expose duplicate timers.
- Use a fake Canvas context or recording backend to observe per-frame drawing.

## Gates and Open Questions

- FPS drift policy is unresolved.
- Frame error stop-versus-continue policy is unresolved.
- Background clearing should remain user-controlled unless decided otherwise.
- Browser test harness choice remains open.

## Notes

This adapter should be thin. If implementation feels like it is reinterpreting GIC or inventing rendering semantics, move that decision back to the appropriate runtime or backend milestone.
