<!-- ABOUTME: Records the parser milestone for function call expressions in GIC. -->
<!-- ABOUTME: Documents call-expression grammar, AST shape, and verification tests. -->

# Parser Milestone: Call Expressions

## Goal

Parse function calls as ordinary expressions.

This milestone makes built-in and user-defined function calls use the same syntax in the AST. The parser does not decide whether a call is valid, built-in, user-defined, or has the right number of arguments.

Examples:

```gic
circle(50, 50, 20);
fill("tomato");
let x = pow(2, 8);
circle(50, 25 + 25, 10 * 2);
```

## Included

The parser supports:

- Call expressions as expression statements
- Call expressions inside variable initializers
- Zero or more comma-separated arguments
- Arguments that are full expressions

## Not Included

This milestone does not include:

- Built-in function validation
- Argument count validation
- User-defined function declarations
- Function return checking
- Runtime call behavior
- Method/property calls

## Grammar

```ebnf
unary     = ( "!" | "-" ) unary
          | call ;

call      = primary ( "(" arguments? ")" )* ;

arguments = expression ( "," expression )* ;

primary   = NUMBER
          | STRING
          | "true"
          | "false"
          | IDENTIFIER
          | "(" expression ")" ;
```

`call` sits between `unary` and `primary` so calls bind tightly, while call arguments can still contain full expressions.

## AST Shape

```txt
Call
  callee: Expression
  arguments: Expression[]
  paren: Token
```

Example:

```gic
circle(50, 25 + 25, 10 * 2);
```

Expected simplified shape:

```txt
ExprStmt
  Call
    callee: Identifier circle
    arguments:
      Literal 50
      Binary +
        Literal 25
        Literal 25
      Binary *
        Literal 10
        Literal 2
```

## Tests

The milestone is covered by parser tests for:

```gic
circle(50, 50);
```

```gic
let x = pow(2, 8);
```

```gic
circle(50, 25 + 25, 10 * 2);
```

## Follow-up Cleanup

Before moving on, clean up parser tests by naming all anonymous tests and removing accidental leading whitespace from test source strings.
