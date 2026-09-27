<!-- ABOUTME: Defines the parser milestone for function declarations and return statements in GIC. -->
<!-- ABOUTME: Documents function grammar, AST changes, parser behavior, and verification tests. -->

# Parser Milestone: Functions and Return Statements

## Goal

Parse function declarations with parameters and bodies, plus return statements with optional values.

This milestone supports:

```gic
func multiply(x, y) {
  return x * y;
}
```

```gic
func drawSquare(x, y, size) {
  rect(x, y, size, size);
  return;
}
```

## Included

The parser should support:

- Function declarations with zero or more comma-separated parameters
- Required parentheses around parameters
- Required braces around function bodies
- `return;` statements
- `return expression;` statements
- Function bodies containing zero or more statements
- Rejecting `func` declared inside any block (function, `if`, `repeat`)

## Not Included

Do not implement these in this milestone:

- Runtime function call behavior
- Void-vs-value return consistency checks
- Enforcement that every function must return
- Declared-before-use checks
- Recursion limits
- Function, parameter, or local-variable scoping and shadowing checks
- Error recovery

These belong to later analyzer or interpreter milestones.

## Grammar

```ebnf
funcDecl   = "func" IDENTIFIER "(" params? ")" block ;
params     = IDENTIFIER ( "," IDENTIFIER )* ;
returnStmt = "return" expression? ";" ;

block      = "{" statement* "}" ;
```

## AST Change

Add function and return statement nodes. The source-facing AST name is `FuncStmt`, while the grammar production remains `funcDecl`:

```txt
FuncStmt
  type: "FuncStmt"
  name: Token
  params: Token[]
  body: Statement[]

ReturnStmt
  type: "ReturnStmt"
  value?: Expression
```

Extend the statement union:

```txt
Statement = VarDecl | IfStmt | RepeatStmt | FuncStmt | ReturnStmt | Assignment | ExprStmt
```

The function name and parameters are `Token` values, matching the identifier convention used by `VarDecl`, `Assignment`, and `RepeatStmt`. The grammar requires identifiers in these positions, not general expressions.

## Concepts to Understand

- A function declaration is a statement that introduces a name and a braced body.
- Parameters are a comma-separated list of identifier tokens inside required parentheses.
- A function body owns a function-local scope, while control-flow bodies own block-local scopes.
- `return;` has no value expression; `return expression;` has one.
- The parser records return syntax wherever it appears, but later semantic lessons decide whether that placement and return kind are legal.
- A `func` declared inside a function, `if`, or `repeat` block is a parse error. Language specification revision 2.2 keeps function declarations global and does not support closures.

## Behavior Checklist

- Parse a function with no parameters.
- Parse one and multiple parameter names.
- Parse an empty function body.
- Parse a function body containing existing statement forms.
- Parse `return;` with no value field.
- Parse `return expression;` with the expression shape preserved.
- Preserve function name and parameter tokens for diagnostics.
- Reject missing required `(`, `)`, `{`, `}`, and return `;` tokens.

## Focused Questions

- Which AST field should distinguish `return;` from `return x;`?
- Should duplicate parameter names be accepted by the parser and reported later?
- What should a missing `}` diagnostic say when the function body reaches EOF?

## Tests

The milestone should be covered by tests for:

- No-parameter function with `return;`
- One-parameter function
- Multiple-parameter function
- Function with `return expression;`
- Function with a non-return body, such as an assignment
- Rejecting a `func` declared inside a function body
- Rejecting a `func` declared inside an `if` body
- Rejecting a `func` declared inside a `repeat` body
- Rejecting a `func` declared in an outer block after a nested scope has opened and closed (regression for block-depth tracking)
- Function containing `if` and `repeat` statements
- Missing `(` after the function name
- Missing `)` after parameters
- Missing `{` before the function body
- Missing `}` after the function body (reported by block parsing)
- `return value` missing the trailing `;`

## Notes

The parser only checks syntax. Return-kind consistency, required returns, declaration order, scoping, recursion policy, and call behavior belong to later analyzer or interpreter milestones.
