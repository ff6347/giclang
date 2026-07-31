<!-- ABOUTME: Defines the next parser milestone for reassignment statements in GIC. -->
<!-- ABOUTME: Describes assignment grammar, AST changes, parser behavior, and tests. -->

# Parser Milestone: Assignment Statements

## Goal

Parse reassignment statements for already-declared variables.

This milestone supports syntax like:

```gic
let x = 1;
x = x + 1;
```

GIC has variable declarations with `let`, and variables can be reassigned after declaration. Parsing assignment now makes variables useful before adding control flow or loops.

## Included

The parser should support:

- Assignment statements: `IDENTIFIER = expression ;`
- Assignment values that are full expressions
- Assignment statements alongside existing declarations and expression statements

## Not Included

Do not implement these in this milestone:

- Semantic checks for declared-before-use
- Runtime reassignment behavior
- Assigning to non-identifiers
- Compound assignment operators like `+=`
- Assignment expressions inside larger expressions
- `if`
- `repeat`
- `func`
- `return`
- `loop`
- Blocks

## Grammar

For this milestone, treat assignment as a statement, matching the current GIC specification:

```ebnf
program     = statement* EOF ;

statement   = varDecl
            | assignment
            | exprStmt ;

varDecl     = "let" IDENTIFIER "=" expression ";" ;

assignment  = IDENTIFIER "=" expression ";" ;

exprStmt    = expression ";" ;
```

Expression grammar stays the same as the previous milestones.

## AST Change

Add an assignment statement node:

```txt
Assignment
  name: Token
  value: Expression
```

Extend the statement union:

```txt
Statement = VarDecl | Assignment | ExprStmt
```

## Concepts to Understand

The parser needs to distinguish these cases:

```gic
x = x + 1;
```

```gic
x + 1;
```

Both begin with `IDENTIFIER`, but only the first matches the assignment grammar. The observable behavior is:

- `IDENTIFIER = expression ;` becomes an `Assignment` statement.
- `IDENTIFIER` followed by another expression operator remains an expression statement.
- The assignment target is a token, not an expression node.
- Only semantic analysis decides whether the assigned name was declared.

## Focused Questions

- What token sequence proves a statement is an assignment rather than an expression statement?
- Where should the parser report an error for `x = ;`?
- Should `x + 1;` still parse after assignment support is added?
- Why does `1 = x;` not belong to this milestone's assignment grammar?

## Tests

### Simple assignment

```gic
x = 1;
```

Expected simplified shape:

```txt
Assignment x
  Literal 1
```

### Assignment with expression value

```gic
x = x + 1;
```

Expected simplified shape:

```txt
Assignment x
  Binary +
    Identifier x
    Literal 1
```

### Declaration followed by assignment

```gic
let x = 1;
x = x + 1;
```

Expected simplified shape:

```txt
Program
  VarDecl x
    Literal 1
  Assignment x
    Binary +
      Identifier x
      Literal 1
```

### Identifier expression statement still works

```gic
x;
```

Expected simplified shape:

```txt
ExprStmt
  Identifier x
```

This test proves the parser does not treat every identifier-starting statement as assignment.

## Notes

The parser only checks syntax. It should allow this for now:

```gic
x = 1;
```

Even if `x` was not declared earlier. Declared-before-use belongs in the analyzer milestone.
