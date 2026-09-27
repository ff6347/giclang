<!-- ABOUTME: Records the completed parser milestone for repeat statements in GIC. -->
<!-- ABOUTME: Documents repeat grammar, AST shape, parser behavior, and verification tests. -->

# Parser Milestone: Repeat Statements

## Goal

Parse the GIC loop construct with a loop variable, start, end, and optional step.

This milestone supports:

```gic
repeat(i, 0, 10) {
  circle(i * 10, 50, 5);
}
```

```gic
repeat(i, 10, 0, -1) {
  circle(i * 10, 50, 5);
}
```

## Included

The parser supports:

- `repeat` statements with three arguments: variable, start, end
- `repeat` statements with four arguments: variable, start, end, step
- Loop variable as a plain identifier token
- Start, end, and step as full expressions, including unary expressions
- Blocks containing zero or more statements
- Nested `repeat` statements

## Not Included

This milestone does not include:

- Runtime iteration behavior
- Checking that start, end, and step evaluate to numbers
- Preventing reassignment of the loop variable
- The `step` default of `1` (applied by the interpreter, not the parser)
- `func`
- `return`
- `loop`

## Grammar

```ebnf
repeatStmt = "repeat" "(" IDENTIFIER "," expression "," expression ( "," expression )? ")" block ;

block      = "{" statement* "}" ;
```

## AST Change

Add a repeat statement node:

```txt
RepeatStmt
  variable: Token
  start: Expression
  end: Expression
  step?: Expression
  body: Statement[]
```

Extend the statement union:

```txt
Statement = VarDecl | IfStmt | RepeatStmt | Assignment | ExprStmt
```

The loop variable is a `Token`, matching `VarDecl.name` and `Assignment.name`. The grammar requires an `IDENTIFIER`, not a general expression, so the AST should keep the variable as a name token while start, end, and step remain expressions.

## Concepts to Understand

- `repeat` is a statement whose header has a fixed argument shape.
- The first header item names the loop variable; it is not evaluated as an expression.
- Start, end, and optional step use the normal expression grammar.
- The parser records whether a step expression was written, but it does not apply the default step value.
- The body is a braced statement block and may contain nested repeats.

## Behavior Checklist

- Parse `repeat(i, start, end) { ... }` with no `step` property.
- Parse `repeat(i, start, end, step) { ... }` with a `step` expression.
- Preserve unary expressions such as `-1` in the step position.
- Allow an empty body and a body with existing statement forms.
- Allow nested `repeat` statements.
- Reject a missing loop variable name.
- Reject missing commas between header items.
- Reject missing `)` after the header.
- Reject missing `{` before the body.

## Tests

The milestone is covered by tests for:

- Three-argument repeat with empty body
- Four-argument repeat with step
- Repeat with a statement body
- Nested repeat statements
- Negative unary step: `repeat(i, 10, 0, -1)`
- Missing `(` after `repeat`
- Missing loop variable name
- Missing `,` after variable, start, and end
- Missing `)` after arguments
- Missing `{` before body

## Notes

The step is optional. When omitted, the AST node has no `step` property; the interpreter applies the default of `1` at runtime.

Tests should assert the observable AST shape: an omitted step has no `step` field, while a written step appears with its parsed expression shape.
