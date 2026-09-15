<!-- ABOUTME: Records the planning session that reorganized remaining GIC delivery around vertical slices. -->
<!-- ABOUTME: Captures the transition boundary, scope-preservation rule, review findings, and verification. -->

# Vertical Slice Roadmap Planning

## Summary

The function-call and arity analyzer milestone was completed before this plan branch started. The remaining work is organized in `docs/plans/vertical-slice-roadmap.md` around executable product slices rather than separate analyzer, interpreter, backend, and editor phases.

## Decisions

- [decision] `docs/LESSONS.md` remains the feature-completeness ledger; a horizontal milestone stays unchecked while a vertical slice implements only part of it.
- [decision] The remaining semantic rules move beside the runtime behavior that makes them observable: repeat rules with repetition, returns with functions, built-in checks with built-ins, and animation rules with animation.
- [decision] The first checkpoint is a source-to-browser static drawing through the real parser, analyzer, interpreter, recording backend, and Canvas path.
- [decision] Every existing decision gate remains explicit. Mutually exclusive options are resolved rather than all implemented.
- [direction] Distribution and revision 3 language growth follow an experiment-ready revision 2.2 browser environment without being removed from the long-term roadmap.

## Review Findings

An independent plan review found two dependency errors in the first draft:

- the combined built-in semantic milestone cannot close before animation policy is resolved;
- the full CLI milestone depends on runtime and animation work not available in the repeated-pattern slice.

The roadmap now closes built-in semantics in the animation slice, places full CLI work after its prerequisites, establishes callable and static-lifecycle seams in the first drawing slice, timeboxes browser decisions, and orders the browser IDE prerequisites explicitly.

## Verification

- All relative Markdown links resolve.
- `pnpm fmt:check` passes.
- `git diff --check` passes.
- No executable code changed.
