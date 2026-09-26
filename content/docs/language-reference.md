---
title: Language reference
order: 0
---

Language reference and help for writing GIC programs.

### Comments

Comments are ignored by gic. They are only for annotating code. Write many comments to explain what your code does.

```gic
// This is a comment
```

### Semi-colons

Semi-colons are used to separate statements and are required. Always!

```gic
print
```

### Output

The `print` function is used to output values to the on screen console.

```gic
print("Hi");
```

### Primitives values/ data types

| Type    | Description             | Examples                   |
| ------- | ----------------------- | -------------------------- |
| Number  | Can be float or integer | `42`, `3.14`, `-10`, `0.5` |
| Boolean | True or false           | `true`, `false`            |
| String  | Text in double quotes   | `"Hello World"`            |

### Variables Declaration

Variables need to be initialized at declaration.

```gic
let x = 1;
```

Reassignment is allowed.

```gic
let x = 1;
let y = "Hi there!";
let z = true;
x = 2;
z = y;
```

All variables must be created before their usage. Their names start with a letter or an underscore followed by letters, digits or underscores. You can't have a hyphen in a variable name.

Once a variable name is declared, it cannot be declared again. Also not in scopes of blocks [^What is a block?] like repeat, functions or conditionals.

A variable that's declared in the block of a repeat function or conditional is not accessible from outside of this block.

Reserved words cannot be used as variable names. E.g. `let` is a reserved word and cannot be used as name.

[^What is a block?]: A block is a section of code that is enclosed in curly braces `{}`.

### Reserved words

| Word     | Description           |
| :------- | :-------------------- |
| `let`    | Variable declaration  |
| `if`     | Conditional statement |
| `else`   | Conditional statement |
| `repeat` | Loop statement        |
| `print`  | Print statement       |
| `func`   | Function declaration  |
| `return` | Function return value |
| `true`   | Boolean value         |
| `false`  | Boolean value         |

There are also some built-in functions and constants that cannot be used as variable names.

#### Constants

These are meant to make life easier.

| Constant | Description            |
| :------- | :--------------------- |
| `PI`     | Pi constant            |
| `WIDTH`  | sketch width constant  |
| `HEIGHT` | sketch height constant |

#### Math Functions

These are mathematical functions that can be used to perform calculations.

| Math Functions | Description                              |
| :------------- | :--------------------------------------- |
| `sqrt`         | Square root function                     |
| `sin`          | Sine function                            |
| `cos`          | Cosine function                          |
| `random`       | Random float between 0 and 1             |
| `randomSeed`   | Set random seed for reproducible outputs |
| `floor`        | Round down to integer                    |
| `ceil`         | Round up to integer                      |
| `round`        | Round to nearest integer                 |
| `abs`          | Absolute value                           |
| `min`          | Smaller of two values                    |
| `max`          | Larger of two values                     |
| `pow`          | Exponentiation                           |

#### Drawing Functions

These are functions that can be used to draw shapes on the canvas.

| Drawing Functions | Description                    |
| :---------------- | :----------------------------- |
| `fill`            | Set fill color for shapes      |
| `noFill`          | Disable fill                   |
| `stroke`          | Set stroke (outline) color     |
| `noStroke`        | Disable stroke                 |
| `strokeWidth`     | Set stroke thickness in pixels |
| `point`           | Draw a solid round point       |
| `line`            | Draw line                      |
| `rect`            | Draw rectangle                 |
| `circle`          | Draw circle                    |
| `ellipse`         | Draw ellipse                   |
| `triangle`        | Draw triangle                  |
| `quad`            | Draw quadrilateral             |
| `arc`             | Draw open arc                  |
