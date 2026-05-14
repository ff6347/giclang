<!-- ABOUTME: Records the initial parser milestone for basic declarations and primary expressions. -->
<!-- ABOUTME: Documents the parser scope completed before expression precedence work. -->

# Parser Milestone: Basic Declarations and Primary Expressions

## Goal

Parse a small GIC program into an AST `Program` node.

This milestone establishes the parser skeleton and supports simple variable declarations with primary expressions.

Example:

```gic
let x = 1;
let color = "tomato";
let ok = true;
let y = other;
```

## Included

The parser supports:

- Program nodes
- Variable declarations
- Required variable initializers
- Number literals
- String literals
- Boolean literals
- Identifier expressions

## Not Included

This milestone does not include:

- Expression statements
- Unary operators
- Binary operators
- Operator precedence
- Grouping expressions
- Function calls
- Assignment
- `if`
- `repeat`
- `func`
- `return`
- `loop`
- Blocks
- Error recovery

## Grammar

```ebnf
program     = declaration* EOF ;

declaration = varDecl
            | statement ;

statement   = exprStmt ;

varDecl     = "let" IDENTIFIER "=" expression ";" ;

expression  = primary ;

primary     = NUMBER
            | STRING
            | "true"
            | "false"
            | IDENTIFIER ;
```

`statement` and `exprStmt` are part of the parser structure, but expression statements are completed in the next parser milestone.

## AST Nodes

The milestone uses these AST nodes:

```txt
Program
  statements: Statement[]

VarDecl
  name: Token
  initializer: Expression

Literal
  value: number | string | boolean

Identifier
  name: Token
```

The AST stores tokens for names so later errors can point at source locations.

## Parser Helpers

The parser skeleton includes helpers for token navigation:

```txt
peek()      current token without consuming
previous()  most recently consumed token
advance()   consume current token
check()     test current token type
match()     test and consume one of several token types
consume()   require a token type or throw a parser error
```

## Tests

The first parser test verifies:

```gic
let x = 1;
```

Expected simplified shape:

```txt
Program
  VarDecl x
    Literal 1
```

Parser tests simplify token fields for readability. The real AST keeps token objects.
