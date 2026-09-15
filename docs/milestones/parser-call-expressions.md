<!-- ABOUTME: Records the parser milestone for function call expressions in GIC. -->
<!-- ABOUTME: Documents call-expression grammar, AST shape, and verification tests. -->

# Parser Milestone: Call Expressions

## Goal

Parse function calls as ordinary expressions.

This milestone makes built-in and user-defined function calls use the same identifier-target syntax in the AST. The parser enforces that syntactic boundary but does not decide whether the identifier names a valid built-in or user-defined function or whether the call has the right number of arguments.

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
- Bare identifier call targets shared by built-in and user-defined functions

## Not Included

This milestone does not include:

- Built-in function validation
- Argument count validation
- User-defined function declarations
- Function return checking
- Runtime call behavior
- Method/property calls
- Generic expression or chained-call targets

## Grammar

```ebnf
unary     = ( "!" | "-" ) unary
          | call ;

call      = IDENTIFIER "(" arguments? ")"
          | primary ;

arguments = expression ( "," expression )* ;

primary   = NUMBER
          | STRING
          | "true"
          | "false"
          | IDENTIFIER
          | "(" expression ")" ;
```

`call` sits between `unary` and `primary` so calls bind tightly, while call arguments can still contain full expressions. Only the `IDENTIFIER` branch may be followed by an argument list.

## AST Shape

```txt
Call
  callee: IdentifierExpr
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

## Verification

Positive parser coverage includes:

```gic
circle(50, 50);
```

```gic
let x = pow(2, 8);
```

```gic
circle(50, 25 + 25, 10 * 2);
```

Identifier-only alignment also requires parser-error coverage for non-identifier and chained-call targets:

```gic
42();
(circle)(1);
makeThing()(1);
```

Each rejected target reports `Only function names can be called.` at the opening `(` that attempts the invalid call.

## Follow-up Cleanup

Before moving on, clean up parser tests by naming all anonymous tests and removing accidental leading whitespace from test source strings.
