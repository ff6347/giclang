<!-- ABOUTME: Defines the parser milestone for if, else if, and else statements in GIC. -->
<!-- ABOUTME: Documents block parsing, AST changes, grammar, and tests for conditionals. -->

# Parser Milestone: If Statements

## Goal

Parse conditional control flow with required parentheses and required braces.

This milestone supports:

```gic
if (x > 10) {
  circle(50, 50, 20);
}
```

```gic
if (x > 10) {
  circle(50, 50, 20);
} else {
  circle(25, 25, 10);
}
```

```gic
if (x > 10) {
  circle(50, 50, 20);
} else if (x > 5) {
  circle(25, 25, 10);
}
```

```gic
if (x > 10) { circle(50, 50, 20); } else { circle(10, 10, 5); }
```

## Included

The parser should support:

- `if` statements
- Optional `else` blocks
- `else if` chains
- Required parentheses around conditions
- Required braces around branches
- Blocks containing zero or more statements

## Not Included

Do not implement these in this milestone:

- Runtime execution of conditionals
- Type checking that conditions are boolean
- `repeat`
- `func`
- `return`
- `loop`
- Error recovery

## Grammar

```ebnf
statement   = ifStmt
            | assignment
            | exprStmt ;

ifStmt      = "if" "(" expression ")" block
              ( "else" "if" "(" expression ")" block )*
              ( "else" block )? ;

block       = "{" declaration* "}" ;
```

Existing declaration parsing remains:

```ebnf
declaration = varDecl
            | statement ;

varDecl     = "let" IDENTIFIER "=" expression ";" ;
```

## AST Change

Add an if statement node:

```txt
IfStmt
  type: "IfStmt"
  condition: Expression
  thenBranch: Statement[]
  elseBranch?: Statement[]
```

Extend the statement union:

```txt
Statement = VarDecl | Assignment | IfStmt | ExprStmt
```

`else if` can be represented as an `elseBranch` containing one nested `IfStmt` statement.

Example:

```gic
if (a) {
  x = 1;
} else if (b) {
  x = 2;
}
```

Simplified shape:

```txt
IfStmt
  condition: Identifier a
  thenBranch:
    Assignment x
      Literal 1
  elseBranch:
    IfStmt
      condition: Identifier b
      thenBranch:
        Assignment x
          Literal 2
```

## Concepts to Understand

- `if` is a statement form, so it must be recognized before falling back to expression statements.
- A condition is any expression, but this parser milestone does not decide whether it is boolean.
- Braces are part of the syntax contract, not optional formatting.
- A block produces a list of statements and declarations for its branch body.
- `else if` is syntax for an `else` branch whose only statement is another `IfStmt`.
- Tests should observe no `elseBranch` field when source has no `else`, instead of relying on an `undefined` placeholder.

## Behavior Checklist

- Parse `if` with a condition in parentheses and a braced then branch.
- Parse an `else` branch only when it follows the then branch.
- Parse an `else if` chain as nested conditional AST shape.
- Allow empty branch blocks.
- Allow declarations and existing statements inside branch blocks.
- Reject a condition that is missing `(` or `)`.
- Reject an unbraced then or else branch.

## Focused Questions

- What visible AST shape distinguishes `else` from `else if`?
- Which source location should a missing `{` diagnostic point at?
- Should a declaration inside a branch parse before semantic scoping rules exist?
- What should happen if `else` appears without a preceding `if`?

## Tests

### If without else

```gic
if (x > 10) {
  x = 1;
}
```

Expected simplified shape:

```txt
IfStmt
  condition:
    Binary >
      Identifier x
      Literal 10
  thenBranch:
    Assignment x
      Literal 1
```

### If with else

```gic
if (x > 10) {
  x = 1;
} else {
  x = 2;
}
```

Expected simplified shape:

```txt
IfStmt
  condition:
    Binary >
      Identifier x
      Literal 10
  thenBranch:
    Assignment x
      Literal 1
  elseBranch:
    Assignment x
      Literal 2
```

### Else-if chain

```gic
if (x > 10) {
  x = 1;
} else if (x > 5) {
  x = 2;
} else { x = 3; }
```

Expected simplified shape:

```txt
IfStmt
  condition:
    Binary >
      Identifier x
      Literal 10
  thenBranch:
    Assignment x
      Literal 1
  elseBranch:
    IfStmt
      condition:
        Binary >
          Identifier x
          Literal 5
      thenBranch:
        Assignment x
          Literal 2
      elseBranch:
        Assignment x
          Literal 3
```

### Braces are required

```gic
if (x > 10) x = 1;
```

Should throw a parser error.

### Parentheses are required

```gic
if x > 10 {
  x = 1;
}
```

Should throw a parser error.

## Notes

The parser only checks syntax. It should not decide whether the condition is boolean. That belongs in the analyzer milestone.
