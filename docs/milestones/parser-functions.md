<!-- ABOUTME: Defines the parser milestone for function declarations and return statements in GIC. -->
<!-- ABOUTME: Documents function grammar, AST changes, parser approach, and verification tests. -->

# Parser Milestone: Functions and Return Statements

## Goal

Parse function declarations with parameters and bodies, plus return statements with optional values.

This milestone supports:

```gic
func multiply(x, y) {
  return x * y;
}

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
- Nested function declarations as permitted by the grammar

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

The function name and parameters are `Token` values, matching the identifier
convention used by `VarDecl`, `Assignment`, and `RepeatStmt`. The grammar
requires identifiers in these positions, not general expressions.

## Parser Approach

Add `func` and `return` handling to statement dispatch:

```txt
statement()
  if match(FUNC): funcStatement()
  if match(RETURN): returnStatement()
```

`funcStatement()` should run after `statement()` has already matched the `func` keyword:

1. Consume the function name as an `IDENTIFIER` token.
2. Consume `(`.
3. If the next token is not `)`, parse one or more comma-separated `IDENTIFIER` parameters.
4. Consume `)` and `{`.
5. Parse the function body via `block()`.

`returnStatement()` should run after `statement()` has already matched the `return` keyword:

1. If the next token is not `;`, parse an expression as the return value.
2. Consume `;`.

This assumes `block()` is called after `{` has been consumed, matching the
chosen block convention elsewhere in the parser.

## Tests

The milestone should be covered by tests for:

- No-parameter function with `return;`
- One-parameter function
- Multiple-parameter function
- Function with `return expression;`
- Function with a non-return body, such as an assignment
- Nested function declarations
- Function containing `if` and `repeat` statements
- Missing `(` after the function name
- Missing `)` after parameters
- Missing `{` before the function body
- Missing `}` after the function body (reported by `block()`)
- `return value` missing the trailing `;`

## Notes

The parser only checks syntax. Return-kind consistency, required returns,
declaration order, scoping, recursion policy, and call behavior belong to later
analyzer or interpreter milestones.
