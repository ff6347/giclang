<!-- ABOUTME: Defines the next parser milestone for expression precedence in GIC. -->
<!-- ABOUTME: Lists the grammar subset, implementation order, and tests to guide parser work. -->

# Parser Milestone: Expression Precedence

## Goal

Parse expression statements and variable initializers with correct operator precedence.

This milestone should make programs like this parse correctly:

```gic
let x = 1 + 2 * 3;
let y = -(x + 4);
let ok = x >= 3 && y != 0;
```

## Not Included Yet

Do not implement these in this milestone:

- Function calls: `circle(50, 50, 20);`
- Assignment: `x = x + 1;`
- `if`
- `repeat`
- `func`
- `return`
- `loop`
- Blocks: `{ ... }`

## Grammar

```ebnf
program     = statement* EOF ;

statement   = varDecl
            | exprStmt ;

varDecl     = "let" IDENTIFIER "=" expression ";" ;

exprStmt    = expression ";" ;

expression  = orExpr ;

orExpr      = andExpr ( "||" andExpr )* ;

andExpr     = equality ( "&&" equality )* ;

equality    = comparison ( ( "==" | "!=" ) comparison )* ;

comparison  = term ( ( ">" | ">=" | "<" | "<=" ) term )* ;

term        = factor ( ( "+" | "-" ) factor )* ;

factor      = unary ( ( "*" | "/" | "%" ) unary )* ;

unary       = ( "!" | "-" ) unary
            | primary ;

primary     = NUMBER
            | STRING
            | "true"
            | "false"
            | IDENTIFIER
            | "(" expression ")" ;
```

## Implementation Order

1. Add expression statement parsing.
2. Add grouping expressions.
3. Add unary expressions: `!`, unary `-`.
4. Add multiplication-level binary expressions: `*`, `/`, `%`.
5. Add addition-level binary expressions: `+`, `-`.
6. Add comparison expressions: `<`, `<=`, `>`, `>=`.
7. Add equality expressions: `==`, `!=`.
8. Add logical AND expressions: `&&`.
9. Add logical OR expressions: `||`.

## Suggested Parser Methods

```txt
expression()  -> or()
or()          -> and()
and()         -> equality()
equality()    -> comparison()
comparison()  -> term()
term()        -> factor()
factor()      -> unary()
unary()       -> primary()
primary()     -> literals, identifiers, grouping
```

## Tests

Start with these tests, one at a time.

### Arithmetic precedence

```gic
let x = 1 + 2 * 3;
```

Expected shape:

```txt
VarDecl x
  Binary +
    Literal 1
    Binary *
      Literal 2
      Literal 3
```

### Grouping overrides precedence

```gic
let x = (1 + 2) * 3;
```

Expected shape:

```txt
VarDecl x
  Binary *
    Grouping
      Binary +
        Literal 1
        Literal 2
    Literal 3
```

### Unary expression

```gic
let x = -1;
```

Expected shape:

```txt
VarDecl x
  Unary -
    Literal 1
```

### Comparison and equality

```gic
let ok = 1 + 2 == 3;
```

Expected shape:

```txt
VarDecl ok
  Binary ==
    Binary +
      Literal 1
      Literal 2
    Literal 3
```

### Logical precedence

```gic
let ok = true || false && !done;
```

Expected shape:

```txt
VarDecl ok
  Logical ||
    Literal true
    Logical &&
      Literal false
      Unary !
        Identifier done
```

### Expression statement

```gic
1 + 2;
```

Expected shape:

```txt
ExprStmt
  Binary +
    Literal 1
    Literal 2
```

## Test Helper Update

Extend the parser test simplifier to handle:

- `Identifier`: convert `name` token to `name.lexeme`
- `Binary`: convert `operator` token to `operator.lexeme`
- `Logical`: convert `operator` token to `operator.lexeme`
- `Unary`: convert `operator` token to `operator.lexeme`
- `Grouping`: recursively simplify inner expression

Keep the real AST using tokens. Only simplify for tests.
