<!-- ABOUTME: Records the completed parser milestone for repeat statements in GIC. -->
<!-- ABOUTME: Documents repeat grammar, AST shape, parser approach, and verification tests. -->

# Parser Milestone: Repeat Statements

## Goal

Parse the GIC loop construct with a loop variable, start, end, and optional step.

This milestone supports:

```gic
repeat(i, 0, 10) {
  circle(i * 10, 50, 5);
}

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

The loop variable is a `Token`, matching `VarDecl.name` and `Assignment.name`.
The grammar requires an `IDENTIFIER`, not a general expression, so the parser
consumes one token directly instead of calling `expression()`.

## Parser Approach

Add `repeat` handling to statement dispatch:

```txt
statement()
  if match(REPEAT): repeatStatement()
```

`repeatStatement()` should:

1. Consume `(`.
2. Consume the loop variable as an `IDENTIFIER` token.
3. Consume `,`, parse start, consume `,`, parse end.
4. If `,` follows, parse step.
5. If neither `,` nor `)` follows end, throw a parser error for the missing comma.
6. Consume `)`, consume `{`, parse the body block.

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

The step is optional. When omitted, the AST node has no `step` property; the
interpreter applies the default of `1` at runtime.

With `exactOptionalPropertyTypes`, an omitted step cannot be set to `undefined`.
Build the node without `step` and assign it only when present.
