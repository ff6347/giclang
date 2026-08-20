<!-- ABOUTME: Frames the unresolved GIC dynamic-list language decision. -->
<!-- ABOUTME: Connects collection needs to the current no-arrays baseline without selecting an option. -->

# Design Dynamic Lists

Status: Unresolved

## Decision Question

Should GIC add a dynamic collection type, and if so, what syntax or API should
it use?

## Current Baseline

Rev 2 has three user-visible data types: Number, Boolean, and String. It
explicitly says there are no arrays, objects, or null. Project memory records
that creative-coding sketches involving palettes, trails, particles, proximity
graphs, or retained generated values need some form of collection if they are to
be expressed directly in GIC.

## Why This Is a Gate

Collections affect the runtime value model, grammar, analyzer diagnostics,
memory behavior, examples, possible library design, and future import decisions.
Adding them late may require reworking value representation, built-in
signatures, and teaching order.

## Options and Consequences

- **No lists**
  - Preserves the current minimal value model and avoids new syntax.
  - Leaves retained multi-value creative-coding patterns outside core GIC or
    dependent on repeated scalar variables.
- **Built-in list API**
  - Adds collections through functions such as creation, append, indexed access,
    replacement, and length.
  - Avoids new literal/index grammar but may make common operations more
    verbose.
- **Array-like syntax**
  - Adds familiar list literals and indexing syntax.
  - Requires grammar, parser, analyzer, runtime, and error-message expansion.
- **Fixed or shape-specific collections**
  - Adds narrow data structures for specific creative-coding needs, such as
    palettes or point sequences.
  - Limits generality but may keep the teaching surface smaller than a full list
    type.

## Questions Before Choosing

- What minimum operations are required: creation, append, indexed read, indexed
  replacement, length, iteration, or removal?
- Are lists homogeneous, heterogeneous, or restricted by operation?
- Are nested lists valid?
- How should out-of-range access fail?
- Can list values be passed to and returned from user-defined functions?
- How does the decision interact with future standard-library or import design?

## Decision Checklist

- Define whether lists are part of core syntax, built-ins, a library, or absent.
- Specify user-visible value behavior and any internal representation
  constraints.
- Define analyzer and runtime errors for invalid operations.
- Decide whether list operations are reserved built-in names.
- Update grammar and parser milestones if syntax changes.
- Add beginner-facing examples only after the collection model is selected.

## Unblocks

- Future implementation milestones for selected dynamic-list syntax, built-in
  API, or library surface.
- Future examples that require retained multi-value creative-coding state.
- [Decide the standard-library and import model](standard-library-import-model.md)

## Related Guidance

- [Data Types](<../Language specification.md#data-types>)
- [Variables](<../Language specification.md#variables>)
- [Implementation Architecture](<../Language specification.md#implementation-architecture>)
- [Memory: Language Design](../MEMORY.md#language-design)
- [Language design journal](../journals/2026-07-29-language-design-and-parser-errors.md)
- [Runtime value milestone](../milestones/runtime-value-environment-errors.md)

## Non-Goals

- Adding objects, classes, maps, or records.
- Defining a complete standard library.
- Implementing particle systems or other example algorithms.
- Changing the existing scalar types.
