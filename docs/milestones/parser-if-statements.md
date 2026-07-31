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

if (x > 10) {
  circle(50, 50, 20);
} else {
  circle(25, 25, 10);
}

if (x > 10) {
  circle(50, 50, 20);
} else if (x > 5) {
  circle(25, 25, 10);
} else {
  circle(10, 10, 5);
}
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

## Parser Approach

Add `if` handling before assignment/expression statements:

```txt
statement()
  if match(IF): ifStatement()
  if current token is IDENTIFIER and next token is EQUAL: assignment()
  otherwise: expressionStatement()
```

Suggested parser methods:

```txt
ifStatement()
block()
```

`ifStatement()` should:

1. Consume `(`.
2. Parse the condition expression.
3. Consume `)`.
4. Parse the then branch block.
5. If `else if` appears, parse a nested `IfStmt` statement inside `elseBranch`.
6. If `else` appears, parse the else branch block.

`block()` should:

1. Consume `{` before entering or assume it has just been consumed consistently.
2. Parse declarations/statements until `}`.
3. Consume `}`.
4. Return `Statement[]`.

Pick one convention for whether `block()` consumes the opening brace or is called after it has already been consumed. Keep it consistent.

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
} else {
  x = 3;
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
