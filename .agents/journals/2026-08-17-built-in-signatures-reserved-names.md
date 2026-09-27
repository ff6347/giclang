<!-- ABOUTME: Records the built-in registry, keyword extraction, and reserved-names session. -->
<!-- ABOUTME: Covers layering decisions, type-level lessons, failed lexer enforcement, and verification. -->

# Built-In Signatures and Reserved Names

## Summary

Completed `docs/milestones/built-in-signatures-reserved-names.md`. The registry in `src/built-ins.ts` covers the full spec inventory except `frameRate`/`frameCount` (deferred to animation work). The lexer's private keyword table moved into `src/keywords.ts` as shared data, and `reservedNames` derives from it plus the registry keys.

## Decisions

- [decision] Functions and constants stay in one registry with a discriminated `FunctionEntry | ConstantEntry` union. Splitting into two maps was rejected: the analyzer needs `entry.kind` for precise errors ("PI is a constant, not callable" beats "unknown function PI").
- [decision] All color functions (`fill`, `stroke`, `background`) share three signatures: string (hex/CSS), OKLCH triple, OKLCH+alpha quad. The Colors prose ("color functions are overloaded") resolves the ambiguity of the per-function tables, which only listed `fill` overloads.
- [decision] `print` has three unary signatures (string, number, boolean); the spec's `print(value)` is read as any `ValueKind`.
- [decision] `reservedNames` = the ten keywords + all registry keys, constants included, as `ReadonlySet<string>`. Constants are reserved because they are read-only global bindings; redeclaring them would shadow into meaninglessness.
- [decision] Reserved-name enforcement belongs to the analyzer at declaration sites, never the lexer. Keywords self-enforce through the grammar (a declaration expects IDENTIFIER and finds LET). `reservedNames` exists for built-ins, which lex as identifiers.
- [decision] `frameRate` and `frameCount` stay out of the registry until the animation milestone; `frameCount` remains a read-only value, not a function, per the spec.
- [decision] `BuiltInKeys` remains a hand-maintained union; `Record` exactness plus TypeScript's duplicate-key error make a uniqueness test redundant. The type is the invariant.
- [decision] A shared `colorSignature` constant is spread into the `fill`/`stroke`/`background` entries. Dedup at the cost of one typo hitting three entries at once.

## Lessons

- [lesson] `{...["a", "b"]}` spreads array indices as object keys: `{ "0": "a", "1": "b" }`. Build lookup sets with `new Set([...Object.keys(a), ...Object.keys(b)])`.
- [lesson] A type predicate is trusted, never verified: `isStopWord` claimed `word is SyntaxKeywords` while checking `reservedNames` (which contains `circle`, `PI`, ...). The false promise passed the compiler; 69 tests failed.
- [lesson] `Readonly<Set<string>>` still allows `.add()`/`.delete()` — readonly properties, but the mutating methods remain callable. `ReadonlySet` omits the mutators entirely.
- [lesson] The lexer cannot enforce reserved names: it sees occurrences, not declarations. `circle(0,0,10)` and `let circle = 3;` share lexemes; legality depends on grammar position. A lex-time throw on reserved words made every program unlexable (77 failing tests).
- [lesson] `Record<string, TokenType>` let any string index the keyword table while typing the result as never-undefined. The exhaustive `Record<SyntaxKeywords, TokenType>` is honest but refuses arbitrary string indexing; classify-then-index with a `word is SyntaxKeywords` predicate using `in`, then `keywords[word]` typechecks.
- [lesson] `deepStrictEqual` metadata tests protect only what they pin: `stroke` shipped string-only while `fill` was correct, because only `fill` had a test. A test written from the implementation locked in `randomSeed` as value-returning against the spec's void. Write pins from the spec, not from the code.
- [lesson] Compare looked-up token types, never source text: `text === TRUE` compares `"true"` with `"TRUE"` and never matches.
- [process] "All tests passing" twice arrived with typecheck red. Run all four gates (test, typecheck, lint, fmt) before believing "done".

## Failed Approaches (reverted)

- Lexer threw `GicError` on any `reservedNames` hit inside `identifier()`. 77 test failures; reverted.
- `builtInKeywords`: a hand-maintained name→same-name map duplicating `Object.keys(builtIns)`. Deleted; derivation beats declaration.

## Verification

- `pnpm test`: 116 total, 115 pass, 1 existing analyzer todo.
- `pnpm typecheck`, `pnpm lint`, `pnpm fmt:check`: clean.

## Current State

Milestone complete; work committed on `main` through `5b8ca5a`. Next: `docs/milestones/semantic-analyzer-diagnostic-harness.md`, whose analyzer will consume `reservedNames` at declaration sites. Signature matching for call errors lives in `semantic-built-in-call-errors.md`.
