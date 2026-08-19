<!-- ABOUTME: Defines the built-in signature and reserved-name registry lesson. -->
<!-- ABOUTME: Teaches shared analyzer/runtime metadata without implementing built-in behavior. -->

# Milestone: Built-In Signatures and Reserved Names

## Learning Goal

Represent spec-listed built-ins and reserved names as shared data that analyzer and interpreter work can reuse, without implementing any built-in behavior yet.

## Prerequisites

Complete or review:

- [Core API and project structure](browser-neutral-core-api.md)
- [Call-expression parsing](parser-call-expressions.md)
- [Function parsing](parser-functions.md)

## Concepts to Understand

- A registry should be data first, not scattered special cases.
- Arity describes how many arguments a callable accepts.
- Overloads are multiple accepted signatures for the same name.
- Constants and functions need different metadata because constants are not callable.
- Reserved keywords, built-in names, and user-defined names may share a single conflict-checking policy.
- Return-kind metadata helps later lessons distinguish value-producing calls from void calls.

## Relevant Specification Links

- [Variables](<../Language specification rev 2.1.md#variables>)
- [Built-in Functions](<../Language specification rev 2.1.md#built-in-functions>)
- [Canvas](<../Language specification rev 2.1.md#canvas>)
- [Colors](<../Language specification rev 2.1.md#colors>)
- [Shape Style](<../Language specification rev 2.1.md#shape-style>)
- [Shape Drawing](<../Language specification rev 2.1.md#shape-drawing>)
- [Console Output](<../Language specification rev 2.1.md#console-output>)
- [Math Functions](<../Language specification rev 2.1.md#math-functions>)
- [Constants](<../Language specification rev 2.1.md#constants>)
- [Semantic Analyzer component](<../Language specification rev 2.1.md#3-semantic-analyzer-analyzerts>)

## Grammar and AST Shape

This is explicitly not a grammar lesson. Calls remain generic `Call` nodes. Built-in meaning comes from analyzer and runtime metadata, not from new parser nodes.

## TDD-Oriented Student Checklist

- Check the registry covers every spec-listed function and constant that is in scope for the current language revision.
- Check representative arities for `circle`, `fill`, `noFill`, `random`, `pow`, and `frameRate`.
- Check constants such as `WIDTH`, `HEIGHT`, `PI`, and `frameCount` are represented separately from functions.
- Check the reserved-name set includes language keywords and built-in names.
- Check registry loading or construction reports no duplicate names.
- Check constants are not marked callable.

## Non-Goals

- No drawing, math, random, or animation runtime implementation.
- No semantic validation beyond registry integrity.
- No new built-ins beyond the specification.
- No domain or type checking unless it is only stored as metadata for later lessons.

## Verification

Use registry integrity or unit tests if the registry is implemented. Run `pnpm test` and `pnpm typecheck` when code changes are made.

## Decision Gates

- Decide the overload model: separate signatures, min/max arity, or another data shape.
- Decide the return-kind model for void, value, and constants.
- Decide whether `frameCount` is always reserved or only meaningful in animated programs.
- Decide how much metadata to store for domains and ranges before type checking exists.
