<!-- ABOUTME: Records the completed lexer milestone for GIC source tokenization. -->
<!-- ABOUTME: Documents the lexer grammar scope, expected behavior, and verification tests. -->

# Lexer Milestone

## Goal

Convert GIC source text into a stream of tokens with line numbers and literal values.

This milestone supports source like:

```gic
let x = 50;
fill("tomato");
let ok = x >= 10 && true;
// ignored comment
```

## Included

The lexer recognizes:

- Numbers: `1`, `2.5`
- Strings: `"tomato"`
- Identifiers: `x`, `circle`, `trueValue`
- Keywords: `let`, `if`, `else`, `repeat`, `func`, `return`, `loop`, `true`, `false`, `null`
- Single-character punctuation: `(`, `)`, `{`, `}`, `,`, `;`
- Arithmetic operators: `+`, `-`, `*`, `/`, `%`
- Comparison operators: `<`, `<=`, `>`, `>=`, `==`, `!=`
- Assignment operator: `=`
- Logical operators: `!`, `&&`, `||`
- Line comments: `// comment`
- End-of-file token

## Not Included

The lexer does not:

- Parse expressions
- Validate variable declarations
- Know whether an identifier is a built-in function
- Handle multi-line comments
- Handle multi-line strings
- Handle Unicode identifiers

## Token Rules

```ebnf
IDENTIFIER = [a-zA-Z_][a-zA-Z0-9_]* ;
NUMBER     = [0-9]+ ( "." [0-9]+ )? ;
STRING     = '"' characters-until-closing-quote '"' ;
COMMENT    = "//" characters-until-newline ;
```

## Literal Values

Tokens use these literal conventions:

- `NUMBER` stores a JavaScript `number`
- `STRING` stores the string contents without quotes
- `TRUE` stores `true`
- `FALSE` stores `false`
- Tokens without runtime values store `null`

Examples:

```txt
NUMBER "42"      literal: 42
STRING "tomato"  literal: "tomato"
TRUE "true"      literal: true
PLUS "+"         literal: null
EOF ""           literal: null
```

## Error Cases

The lexer throws on:

- Unterminated strings
- Unexpected characters
- Single `&`
- Single `|`

Examples:

```gic
"unterminated
```

```gic
a & b
```

```gic
a | b
```

## Tests

The lexer tests cover:

- Variable declarations
- Keywords and identifiers
- Comparison and logical operators
- Line comments
- Strings
- Numbers and arithmetic operators
- Unterminated strings
- Single ampersand errors
- Single pipe errors

Run with:

```bash
pnpm test
```
