<!-- ABOUTME: Frames the unresolved GIC built-in math expansion decision. -->
<!-- ABOUTME: Lists neutral options for dist and Processing-style helpers. -->

# Decide Built-in Math Expansion

Status: Unresolved

## Decision Question

Should GIC expand the rev-2 math built-ins beyond the current list, and if so,
what scope should the expansion have?

## Current Baseline

Rev 2 lists random, randomSeed, rounding, absolute value, min, max, degree-based
sin/cos, sqrt, pow, and constants such as PI, WIDTH, HEIGHT, and frameCount.
Project memory records an open question about whether common Processing-style
helpers such as `dist()` belong in the built-in math API.

## Why This Is a Gate

Built-ins affect reserved names, signature tables, analyzer arity checks,
runtime implementation, examples, documentation, and editor assistance. Adding a
helper such as `dist()` before the scope is defined may set expectations for a
larger Processing-style bundle.

## Options and Consequences

- **Keep rev-2 math only**
  - Preserves the current small built-in surface.
  - Requires users to compose helpers manually or define functions in examples.
- **Add `dist` only**
  - Covers a common creative-coding distance operation.
  - Introduces a precedent for selecting individual Processing-style helpers.
- **Curated Processing bundle**
  - Adds a documented set of familiar helpers such as mapping, constraining,
    interpolation, and distance if selected.
  - Increases reserved names, signature maintenance, and teaching surface.
- **Library or prelude helpers**
  - Keeps the core smaller while making helpers available through an implicit or
    explicit library layer.
  - Depends on the standard-library/import model and may delay helper
    availability.

## Questions Before Choosing

- Which helpers are essential for beginner creative-coding examples?
- Should helper names match Processing/p5.js exactly?
- Are all math helpers numeric-only, or do any accept colors, points, or future
  list values?
- How should domain errors such as invalid square roots or division-like helper
  behavior be reported?
- Should helper functions be user-overridable, reserved, or imported?

## Decision Checklist

- List the exact math functions and constants in scope.
- Define signatures, arity, and domain constraints.
- Decide whether names are reserved globally.
- Align analyzer built-in diagnostics with runtime behavior.
- Update examples only after the selected built-in set is stable.
- Document any dependency on the standard-library/import decision.

## Unblocks

- Future implementation milestones for any selected math helpers beyond rev 2.
- Future examples and visual-regression coverage that require selected expanded
  math helpers.

## Related Guidance

- [Math Functions](<../Language specification rev 2.md#math-functions>)
- [Built-in Functions](<../Language specification rev 2.md#built-in-functions>)
- [Constants](<../Language specification rev 2.md#constants>)
- [User-Defined Functions](<../Language specification rev 2.md#user-defined-functions>)
- [Built-in signatures milestone](../milestones/built-in-signatures-reserved-names.md)
- [Pure math built-ins milestone](../milestones/pure-math-print-randomness-built-ins.md)
- [Example verification milestone](../milestones/example-program-visual-regression.md)

## Non-Goals

- Adding vectors, matrices, complex numbers, or geometry objects.
- Changing trigonometric degree behavior.
- Selecting a standard-library or import model.
- Implementing the built-ins in this document.
