<!-- ABOUTME: Records the first browser-neutral core API implementation and its public result contract. -->
<!-- ABOUTME: Covers the core entry point, structured diagnostics, TDD review, validation, and remaining milestone work. -->

# Browser-Neutral Core API

## Summary

Started `docs/milestones/browser-neutral-core-api.md` by introducing
`src/core.ts` and testing it through `src/tests/core.test.ts`. The new
`parseSource(source)` facade composes the existing lexer and parser without
importing Node, browser, DOM, Canvas, or render-backend APIs.

## Decisions

- [decision] The platform-neutral public entry point is `src/core.ts`, not
  `src/index.ts`. The explicit name communicates the module's architectural
  role and avoids another generic `index` file.
- [decision] The first public operation is `parseSource(source)`. The name
  distinguishes the source-text facade from the lower-level `Parser.parse()`
  method and does not imply that the unfinished analyzer runs.
- [decision] `parseSource()` returns a discriminated `ParseResult`. Success has
  `ok: true`, a `Program`, and `diagnostics`; failure has `ok: false` and
  `diagnostics`. Diagnostics are always present so warnings can be added later
  without changing the result shape.
- [decision] Public diagnostics are structured data with `message`, `line`,
  `start`, and `end`. They are not preformatted terminal strings; the CLI,
  browser editor, tests, and a future LSP can present the same data differently.
- [decision] The lexer and parser may throw expected language errors internally.
  `parseSource()` catches `GicError` and `ParserError` and returns them through
  the diagnostic contract, while unexpected implementation errors continue to
  throw.

## Insights

- [lesson] A return shape using `ok: boolean` and `program?: Program` permits
  contradictory states and does not narrow reliably. Literal `true` and `false`
  branches make the success invariant visible to TypeScript and callers.
- [lesson] An empty diagnostic interface provides no useful public guarantee.
  A small structural interface lets both existing error classes satisfy the
  contract while exposing only fields consumers may depend on.
- [lesson] Public-boundary tests should assert public diagnostic fields rather
  than `instanceof ParserError`; otherwise a parser implementation detail leaks
  into browser and tooling expectations.
- [lesson] Keeping the returned result intact while checking `result.ok` tests
  the discriminated union. Destructuring or optional chaining can hide whether
  narrowing actually guarantees a successful `Program`.

## Verification

- `node --test src/tests/core.test.ts`: 2 passed.
- `pnpm test`: 88 tests total, 87 passed, 1 existing analyzer todo.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with 0 warnings and 0 errors.
- `pnpm fmt:check`: passed.

## Current State

The core parse facade and its success/failure tests are complete. The broader
browser-neutral core milestone remains open. Next steps are to decide which
student-facing AST/token types should be re-exported from `core.ts` and make
`main.ts` delegate language work to the core while retaining only argument
handling, file IO, formatting, output, and exit-status responsibilities.

## Completion

- [decision] `Program` is re-exported from `core.ts` because callers receive it
  from `parseSource()` and should not need to import the internal AST module.
- [decision] `Token` and `TokenType` remain internal until a public tokenization
  operation returns them. Exporting types without a corresponding public
  operation would enlarge the API without serving a caller.
- [decision] `main.ts` delegates parsing to `parseSource()` while retaining
  argument handling, file IO, diagnostic formatting, output, and exit status.

The browser-neutral core milestone is complete. The core has no Node, DOM,
Canvas, or render-backend dependencies, and the CLI success and diagnostic paths
use the public core result contract.

Final verification:

- `node --test src/tests/core.test.ts`: 3 passed.
- `node --test src/tests/cli.test.ts`: 2 passed.
- `pnpm test`: 90 tests total, 89 passed, 1 existing analyzer todo.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with 0 warnings and 0 errors.
- `pnpm fmt:check`: passed.
