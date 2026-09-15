<!-- ABOUTME: Records the repository introspection used to define GIC engineering-agent guidance. -->
<!-- ABOUTME: Captures project structure, quality gates, testing seams, and the accelerated delivery mode. -->

# Engineering Agent Guidance

## Outcome

The root agent guidance now describes GIC as an active application project
rather than a specification exercise. Student-tutoring behavior remains
available as an optional project skill and no longer constrains ordinary
implementation work.

The documentation-specific guide now reflects the actual specification,
decision, milestone, plan, journal, and memory structure instead of the early
unimplemented project layout.

## Repository observations

- [decision] Normal project work uses direct, end-to-end engineering ownership.
  `.agents/skills/tutor/SKILL.md` is loaded only for explicit tutoring work or
  the product's Socratic tutor policy.
- [decision] Static v0.9 application delivery is the active priority; animation
  remains a non-blocking stretch goal.
- [technique] The host-neutral public seam is `parseSource`/`runSource` in the
  core. Recorded drawing commands, structured output, and diagnostics remain
  plain data across CLI, worker, browser, and future desktop boundaries.
- [technique] `pnpm test` runs the core suite, while `pnpm test:compact`
  discovers core and browser-local Node tests. Browser TypeScript has a separate
  project check.
- [technique] Browser acceptance uses real Firefox, worker execution, and Canvas
  pixels. It currently passes 33 tests without test-only DOM markers.
- [technique] The production browser build loads a separate bundled worker and
  succeeds independently of the development server.
- [decision] Source-level acceptance through public seams precedes focused unit
  behavior. CLI acceptance spawns the real command; browser acceptance drives
  the real editor and Canvas.
- [lesson] Exact pixel checks belong on fully covered Canvas regions. Stroke
  edges need visible-difference assertions because antialiasing is expected.
- [lesson] Old journal “current state” sections are historical checkpoints.
  Accepted decisions, active specification, tests, and the assigned git-bug
  issue take precedence.
- [decision] Git-bug is the authoritative project issue store; its configured
  bridge synchronizes rather than creating a parallel issue system.

## Baseline verification

The introspected baseline passed:

- `pnpm test:compact`
- `pnpm typecheck`
- `pnpm typecheck:browser`
- `pnpm lint`
- `pnpm fmt:check`
- `pnpm build:browser`
- `pnpm test:e2e` with 33 Firefox tests
