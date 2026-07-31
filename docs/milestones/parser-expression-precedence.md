<!-- ABOUTME: Defines the next parser milestone for expression precedence in GIC. -->
<!-- ABOUTME: Lists the grammar subset, behavior expectations, and tests to guide parser work. -->

# Parser Milestone: Expression Precedence

## Goal

Parse expression statements and variable initializers with correct operator precedence.

This milestone should make programs like this parse correctly:

```gic
let x = 1 + 2 * 3;
let y = -(x + 4);
```

```gic
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

## Concepts to Understand

- Precedence decides which operator becomes the parent in the AST.
- Grouping with parentheses overrides the usual precedence order.
- Unary operators bind more tightly than binary operators.
- Operators at the same precedence level associate left-to-right for this milestone's binary and logical expressions.
- Expression statements make calls and calculations usable as standalone statements later, even though calls are not included yet.

## Behavior Checklist

Verify each precedence level with one focused parser test before combining many operators:

- Expression statements end with `;` and produce `ExprStmt` nodes.
- Parentheses produce a grouped expression shape.
- Unary `!` and unary `-` attach to the expression immediately to their right.
- `*`, `/`, and `%` bind tighter than `+` and `-`.
- `+` and `-` bind tighter than comparisons.
- Comparisons bind tighter than equality.
- Equality binds tighter than `&&`.
- `&&` binds tighter than `||`.

## Focused Questions

- In `1 + 2 * 3`, which operator should be the root of the expression tree?
- In `(1 + 2) * 3`, what AST node proves the grouping changed the tree?
- In `true || false && !done`, which operation happens last?
- What parser error should a missing closing `)` produce?

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
