<!-- ABOUTME: Frames the unresolved GIC standard-library and import-model decision. -->
<!-- ABOUTME: Records neutral options for no imports, preludes, packages, and files. -->

# Decide the Standard-Library and Import Model

Status: Unresolved

## Decision Question

Does GIC need a standard library or import mechanism, and if so, how should
names from outside the current file enter a program?

## Current Baseline

Rev 2 asks whether GIC needs a standard library, but its grammar has no import
statement. The scoping model is simple and flat, with globals, function locals,
and loop locals. Project memory notes that dynamic list design should come
before imports.

## Depends On

- [Design dynamic lists](dynamic-lists.md) for collection/value-model choices
  that affect library and import shape.

## Why This Is a Gate

Imports and libraries affect grammar, name resolution, reserved names,
declaration order, browser sandbox behavior, packaging, examples, documentation
comments, and runtime loading. A library model chosen too late may conflict with
built-in handling or the educational no-hoisting rules.

## Options and Consequences

- **No standard library or imports**
  - Keeps every program self-contained and the grammar unchanged.
  - Requires reusable helpers to be copied or taught as ordinary user-defined
    functions.
- **Implicit prelude**
  - Makes selected helpers available without import syntax.
  - Expands the reserved or predeclared name set and may blur the line between
    built-ins and library helpers.
- **Logical package imports**
  - Allows named modules independent of file paths.
  - Requires package identity, versioning or catalog rules, and browser
    availability decisions.
- **Relative file imports**
  - Allows local reuse through paths.
  - Requires filesystem or virtual-filesystem rules, cycle handling, and browser
    sandbox integration.

## Questions Before Choosing

- What problem must imports solve that built-ins or examples cannot solve?
- How do imported names interact with no shadowing and declaration-before-use?
- Are imports allowed only at the top level?
- Can imported code execute setup statements, or only define declarations?
- How does the browser IDE provide files, packages, or library metadata?
- Does dynamic-list design need to be resolved first?

## Decision Checklist

- Decide whether external code is absent, implicit, package-based, file-based,
  or another model.
- Specify grammar changes if import syntax exists.
- Define name binding, ordering, shadowing, and cycle rules.
- Define runtime loading and error behavior.
- Align built-in/reserved-name data with any prelude or library names.
- Define documentation and IDE discovery expectations.

## Unblocks

- Future implementation milestones for any selected standard-library, prelude,
  package-import, or file-import model.
- Future IDE/library discovery or documentation work that requires selected
  external-code rules.

## Related Guidance

- [Questions](<../Language specification rev 2.md#questions>)
- [Grammar (EBNF)](<../Language specification rev 2.md#grammar-ebnf>)
- [Scoping Rules](<../Language specification rev 2.md#scoping-rules>)
- [Implementation Architecture](<../Language specification rev 2.md#implementation-architecture>)
- [Memory: Language Design](../MEMORY.md#language-design)

## Non-Goals

- Selecting a package manager or registry.
- Adding dynamic loading during animation frames.
- Defining dynamic lists inside this document.
- Implementing module resolution.
