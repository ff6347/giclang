---
version: "2.2"
---

<!-- ABOUTME: Defines the Gestalten In Code language. -->
<!-- ABOUTME: Specifies GIC syntax, semantics, diagnostics, and implementation architecture. -->

# Gestalten In Code: A Visual Programming Language Specification

Related:

- [[jordanhubbard nanolang A tiny experimental language designed to be targeted by coding LLMs]]

## questions

Does gic need a std lib?

## Overview

**gic** is a minimal is a dynamically typed, garbage collected programming language from the C-Family designed for three purposes:

1. **Education**: Teach programming fundamentals to beginners with immediate visual feedback
2. **AI Art Generation**: Provide a constrained grammar suitable for training/fine-tuning small language models to generate visual art
3. **Artistic Commentary**: Serve as a medium for exploring the intersection of human creativity and machine generation

The language is inspired by Design by Numbers (John Maeda) and Processing (Ben Fry, Casey Reas), with an emphasis on simplicity, clarity, and a gentle learning curve toward tools like p5.js and Processing. It concentrates on 2D drawing and color manipulation.

---

## Design Principles

### 1. Explicit Structure Over Whitespace

Semicolons, commas, braces, and parentheses provide visual boundaries. Whitespace is never syntactically significant. This prevents confusing indentation errors and prepares learners for C-family languages.

### 2. One Way to Do Things

Unlike JavaScript with its many loop constructs and variable declarations, gic offers exactly one way to accomplish each task. This reduces cognitive load and creates predictable patterns for LLM training.

### 3. Immediate Visual Feedback

Every program produces by default visible output. There are no console programs but the canvas is the primary feedback mechanism.

### 4. Fail Clearly

Error messages should be specific, point to exact locations, and suggest fixes. Never show internal implementation details.

### 5. Transferable Knowledge

Syntax and concepts should transfer directly to p5.js/Processing. A student should be able to read p5.js code after learning gic.

### 6. Explicit Over Implicit

All control flow and data flow should be visible in the code. No hoisting, no implicit returns, no variable shadowing.

---

## Language Specification

### File Extension

`.gic`

### Comments

```gic
// Single line comment only
// No multi-line comment syntax (keeps grammar simple)
```

#### Proposed Documentation Comments

GIC should support a small JSDoc-style documentation format for user-defined
functions, parameters, return values, variables, and reusable library code. The
planned IDE could display this documentation in hover and completion
information.

This is a proposed feature, not part of the current syntax. GIC-specific
documentation comments should remain smaller than full JavaScript JSDoc. The
comment syntax, supported metadata, and representation in the AST or analyzer
must be specified before implementation.

### Data Types

gic has three data types:

| Type    | Description           | Examples                   |
| ------- | --------------------- | -------------------------- |
| Number  | 64-bit floating point | `42`, `3.14`, `-10`, `0.5` |
| Boolean | True or false         | `true`, `false`            |
| String  | Text in double quotes | `"Hello World"`            |

There are no arrays, objects, or null.

### Variables

Variables are declared with `let` and can be reassigned:

```gic
let x = 50;
let y = 100;
x = x + 10;  // Reassignment allowed
let message = "Hello";
```

**Constraints:**

- All variables must be initialized at declaration
- Variable names: start with letter or underscore, followed by letters, digits, or underscores
- No `const` or `var` keywords
- Variables must be declared before use (no hoisting)
- Top-level variables and functions share one global namespace
- A global name is reserved throughout the program, regardless of declaration order
- A declaration cannot reuse a name that is visible in the same or an enclosing scope

**Reserved names cannot be used at any declaration site:** `let`, `if`, `else`, `repeat`, `func`, `return`, `loop`, `true`, `false`, `null`, and all built-in function and constant names. This rule applies to variables, functions, parameters, and `repeat` variables.

**Note:** `null` is reserved to prevent confusion, but it is not a value in gic. There is no null type.

### Operators

#### Arithmetic

| Operator | Description                                   |
| -------- | --------------------------------------------- |
| `+`      | Addition (numbers) or concatenation (strings) |
| `-`      | Subtraction (binary) and negation (unary)     |
| `*`      | Multiplication                                |
| `/`      | Division                                      |
| `%`      | Modulo                                        |

#### Comparison

| Operator | Description           |
| -------- | --------------------- |
| `==`     | Equal                 |
| `!=`     | Not equal             |
| `<`      | Less than             |
| `>`      | Greater than          |
| `<=`     | Less than or equal    |
| `>=`     | Greater than or equal |

#### Logical

| Operator | Description         |
| -------- | ------------------- |
| `&&`     | Logical AND         |
| `\|\|`   | Logical OR          |
| `!`      | Logical NOT (unary) |

#### Operator Precedence (highest to lowest)

1. `!`, unary `-`
2. `*`, `/`, `%`
3. `+`, `-`
4. `<`, `>`, `<=`, `>=`
5. `==`, `!=`
6. `&&`
7. `||`

Parentheses can override precedence: `(1 + 2) * 3`

### Control Flow

#### Conditionals

```gic
if (condition) {
  // statements
}

if (condition) {
  // statements
} else {
  // statements
}

if (condition) {
  // statements
} else if (otherCondition) {
  // statements
} else {
  // statements
}
```

**Constraints:**

- Braces are always required, even for single statements
- No ternary operator
- No switch statement

#### Loops

gic has one loop construct: `repeat`

```gic
// repeat(variable, start, end) - iterates from start to end (exclusive)
repeat(i, 0, 10) {
  circle(i * 10, 50, 5);
}

// repeat(variable, start, end, step) - with explicit step
repeat(i, 10, 0, -1) {
  circle(i * 10, 50, 5);  // draws right to left
}

// fractional steps
repeat(t, 0, 100, 0.5) {
  point(t, 50 + sin(t * 3.6) * 20);
}
```

`repeat(i, 0, 10)` is equivalent to `for (let i = 0; i < 10; i++)` in JavaScript.

**Constraints:**

- Loop variable is scoped to the loop body
- Loop variable cannot be reassigned within the loop
- `start`, `end`, and `step` must be expressions that evaluate to numbers
- `start`, `end`, and `step` are evaluated exactly once, before the first iteration
- `step` defaults to `1` if omitted
- `step` must not be `0` (runtime error)
- Positive step: iterates while loop variable < end
- Negative step: iterates while loop variable > end
- No `while`, `for`, `do-while`, or `break`/`continue`

---

## Functions

### User-Defined Functions

Functions are declared with the `func` keyword:

```gic
func multiply(x, y) {
  return x * y;
}

func drawSquare(x, y, size) {
  rect(x, y, size, size);
  return;
}
```

**Syntax:**

- `func` keyword followed by function name
- Parameters in parentheses (comma-separated)
- Function body in braces
- Explicit `return` statement required

**Return statements:**

- `return expression;` - returns a value (Number, Boolean, or String)
- `return;` - returns nothing (for procedures with side effects)
- A return statement is only valid inside a function

**Function kinds:**

A function is either **value-returning** or **void**. This is determined by its return statements:

- A value-returning function uses `return expression;` and its result can be used in expressions (e.g., `let x = multiply(2, 3);`)
- A void function uses `return;` and can only be called as a standalone statement (e.g., `drawSquare(10, 20, 5);`)
- A function cannot mix both kinds of return statements
- Using a void function call in an expression (e.g., `let x = drawSquare(10, 20, 5);`) is a semantic error

**Constraints:**

- All functions must have an explicit `return` statement
- Functions must be declared before they are called (no hoisting)
- Functions must be declared globally
- Function names follow the same declaration and reserved-name rules as variable names
- Function names share the global namespace with top-level variables
- Function names are reserved throughout the program, regardless of declaration order
- Recursion is allowed because a function name is visible inside its own body

### Scoping Rules

gic has a simple lexical scoping model:

| Scope          | Description                                                               |
| -------------- | ------------------------------------------------------------------------- |
| Global         | Direct top-level variables and functions; names are reserved program-wide |
| Function-local | Parameters and variables declared directly in a function body             |
| Block-local    | Variables declared in `if`, `else`, `repeat`, and `loop` bodies           |

**Rules:**

1. References resolve only to declarations that precede them in source order; there is no hoisting
2. Top-level variables and functions share one global namespace
3. Global names are reserved throughout the program, including before their declarations
4. Functions can read and modify global variables that are declared before the reference
5. Parameters and variables declared directly in a function body are local to that function
6. Every `if`, `else`, `repeat`, and `loop` body introduces a block scope; declarations are visible in that block and its nested blocks, but not after the block
7. A `repeat` variable is declared in the repeat body scope after the range expressions are analyzed; it is visible only inside that body
8. A declaration cannot reuse a name visible in the same or an enclosing scope
9. Names may be reused in separate, non-overlapping local or block scopes unless a global declaration reserves that name
10. No closures: functions cannot capture variables from enclosing non-global scopes

**Example:**

```gic
let globalVar = 10;

func helper(a) {
  let local = a * 2;       // Local to this function
  globalVar = globalVar + 1; // Can modify global
  return local + globalVar;
}

func main() {
  let result = helper(5);  // OK - helper declared above
  return;
}
```

**Errors:**

```gic
let size = 10;

func bad(size) {           // ERROR: name already exists
  return size * 2;
}

func also_bad() {
  let size = 5;            // ERROR: name already exists
  return;
}

func earlier_local() {
  let count = 1;           // ERROR: later global declaration reserves 'count'
  return;
}

let count = 10;

func repeat_bad() {
  let index = 0;
  repeat(index, 0, 3) {}   // ERROR: name already exists
  return;
}

func block_local() {
  if (true) {
    let shade = 5;
    print(shade);           // OK: shade is visible in this block
  }
  print(shade);             // ERROR: cannot find name 'shade'

  repeat(i, 0, 3) {
    print(i);               // OK: i is visible in the repeat body
  }
  print(i);                 // ERROR: cannot find name 'i'
  return;
}
```

---

## Animation

gic supports animation through the `loop` block, similar to Arduino's `loop()` function.

### Static Programs

Programs without a `loop` block run once and produce a static image:

```gic
background(20, 0, 0);
fill(70, 60, 50);
circle(50, 50, 30);
```

### Animated Programs

Programs with a `loop` block run continuously:

```gic
// Setup: runs once before animation starts
let angle = 0;

// Loop: runs every frame
loop {
  background(10, 0, 0);

  let x = 50 + cos(angle) * 20;
  let y = 50 + sin(angle) * 20;

  fill(70, 50, angle);
  circle(x, y, 10);

  angle = angle + 2;
}
```

**Rules:**

- Code before `loop` runs once (setup phase)
- Code inside `loop` runs every frame
- Variables declared before `loop` persist between frames
- Variables declared inside `loop` reset each frame
- Only one `loop` block allowed per program
- `loop` block must appear at the end of the program (after all setup code and function declarations)

### Animation Built-ins

| Name             | Type     | Description                                               |
| ---------------- | -------- | --------------------------------------------------------- |
| `frameCount`     | Constant | Current frame number (starts at 0, increments each frame) |
| `frameRate(fps)` | Function | Set target frames per second (default: 60)                |

**Example using frameCount:**

```gic
loop {
  background(10, 0, 0);

  let x = 50 + cos(frameCount * 2) * 20;
  let y = 50 + sin(frameCount * 2) * 20;

  fill(70, 50, frameCount % 360);
  circle(x, y, 10);
}
```

---

## Built-in Functions

### Canvas

The canvas is always 100 pixels wide and 100 pixels high, with its geometric center at (50, 50).

| Function               | Description                                  | Default         |
| ---------------------- | -------------------------------------------- | --------------- |
| `background(l, c, h);` | Fill entire canvas with color in OKLCH space | Black (0, 0, 0) |

`background()` can be called multiple times (clears and repaints).

### Colors

gic uses the OKLCH color space for all color functions.

**OKLCH Parameters:**

- **L (Lightness)**: 0-100 (0 = black, 100 = white)
- **C (Chroma)**: 0-100 (0 = gray, higher = more saturated)
- **H (Hue)**: 0-360 (degrees on color wheel)

Color functions are overloaded and accept:

- OKLCH values: `fill(70, 50, 200);` (lightness 70, chroma 50, hue 200°)
- Hex values: `fill("#ff6347");`
- Named CSS colors: `fill("tomato");`

### Shape Style

Style functions set the current drawing style. They affect all subsequent shapes until changed.

| Function               | Description                         | Default           |
| ---------------------- | ----------------------------------- | ----------------- |
| `fill(l, c, h);`       | Set fill color for shapes           | White (100, 0, 0) |
| `fill(l, c, h, a);`    | Set fill color with alpha (0-100)   | —                 |
| `noFill();`            | Disable fill                        | —                 |
| `stroke(l, c, h);`     | Set stroke (outline) color          | Black (0, 0, 0)   |
| `stroke(l, c, h, a);`  | Set stroke color with alpha (0-100) | —                 |
| `noStroke();`          | Disable stroke                      | —                 |
| `strokeWidth(weight);` | Set stroke thickness in pixels      | 1                 |

### Shape Drawing

All coordinates are in pixels from top-left origin (0, 0). Canvas is 100×100 pixels.

| Function                                   | Description                                   |
| ------------------------------------------ | --------------------------------------------- |
| `point(x, y);`                             | Draw a solid round point centered at (x, y)   |
| `line(x1, y1, x2, y2);`                    | Draw line from (x1, y1) to (x2, y2)           |
| `rect(x, y, width, height);`               | Draw rectangle, (x, y) is top-left corner     |
| `circle(x, y, radius);`                    | Draw circle centered at (x, y)                |
| `ellipse(x, y, width, height);`            | Draw ellipse centered at (x, y)               |
| `triangle(x1, y1, x2, y2, x3, y3);`        | Draw triangle with three vertices             |
| `quad(x1, y1, x2, y2, x3, y3, x4, y4);`    | Draw quadrilateral with four vertices         |
| `arc(x, y, radius, startAngle, endAngle);` | Draw open arc (degrees, 0 = right, clockwise) |

`rect`, `circle`, `ellipse`, `triangle`, and `quad` use the current fill and
stroke state. `point`, `line`, and `arc` use only the current stroke state and
are not drawn while stroke is disabled. A point's diameter equals the current
stroke width. Arc commands remain open and are never filled.

### Console Output

| Function        | Description                             |
| --------------- | --------------------------------------- |
| `print(value);` | Output value to console (for debugging) |

**Note:** There is no built-in text rendering on the canvas. Users who need text can implement letter-drawing functions using primitives, similar to how Design by Numbers handled typography.

### Math Functions

| Function           | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `random(min, max)` | Random float between min (inclusive) and max (exclusive) |
| `randomSeed(n)`    | Set random seed for reproducible outputs                 |
| `floor(n)`         | Round down to integer                                    |
| `ceil(n)`          | Round up to integer                                      |
| `round(n)`         | Round to nearest integer                                 |
| `abs(n)`           | Absolute value                                           |
| `min(a, b)`        | Smaller of two values                                    |
| `max(a, b)`        | Larger of two values                                     |
| `sin(degrees)`     | Sine (input in degrees)                                  |
| `cos(degrees)`     | Cosine (input in degrees)                                |
| `sqrt(n)`          | Square root                                              |
| `pow(base, exp)`   | Exponentiation                                           |

**Note:** Trigonometric functions use degrees, not radians. This is more intuitive for beginners and matches the arc function.

### Constants

| Name         | Value      | Description                           |
| ------------ | ---------- | ------------------------------------- |
| `PI`         | 3.14159…   | Mathematical constant                 |
| `WIDTH`      | 100        | Canvas width                          |
| `HEIGHT`     | 100        | Canvas height                         |
| `frameCount` | 0, 1, 2, … | Current frame number (animation only) |

---

## Grammar (EBNF)

```ebnf
program        = statement* loopBlock? ;

statement      = varDecl
               | assignment
               | ifStmt
               | repeatStmt
               | funcDecl
               | returnStmt
               | exprStmt ;

varDecl        = "let" IDENTIFIER "=" expression ";" ;
assignment     = IDENTIFIER "=" expression ";" ;

ifStmt         = "if" "(" expression ")" block
                 ( "else" "if" "(" expression ")" block )*
                 ( "else" block )? ;

repeatStmt     = "repeat" "(" IDENTIFIER "," expression "," expression ( "," expression )? ")" block ;

funcDecl       = "func" IDENTIFIER "(" params? ")" block ;
params         = IDENTIFIER ( "," IDENTIFIER )* ;

returnStmt     = "return" expression? ";" ;

loopBlock      = "loop" block ;

block          = "{" statement* "}" ;

exprStmt       = expression ";" ;

expression     = orExpr ;
orExpr         = andExpr ( "||" andExpr )* ;
andExpr        = eqExpr ( "&&" eqExpr )* ;
eqExpr         = compExpr ( ( "==" | "!=" ) compExpr )* ;
compExpr       = addExpr ( ( "<" | ">" | "<=" | ">=" ) addExpr )* ;
addExpr        = mulExpr ( ( "+" | "-" ) mulExpr )* ;
mulExpr        = unaryExpr ( ( "*" | "/" | "%" ) unaryExpr )* ;
unaryExpr      = ( "!" | "-" ) unaryExpr | callExpr ;
callExpr       = IDENTIFIER "(" arguments? ")" | primary ;
arguments      = expression ( "," expression )* ;
primary        = NUMBER | STRING | "true" | "false" | IDENTIFIER | "(" expression ")" ;

IDENTIFIER     = [a-zA-Z_][a-zA-Z0-9_]* ;
NUMBER         = [0-9]+ ( "." [0-9]+ )? ;
STRING         = '"' [^"]* '"' ;
```

Call targets are bare identifiers. Built-in and user-defined functions share
this syntax. Parenthesized identifiers, literals, grouped expressions, and call
results cannot be called. The parser reports
`Only function names can be called.` at the opening `(` of an attempted
non-identifier call. Arguments remain full expressions, and calls may appear
inside larger expressions.

---

## Implementation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Source File (.gic)                       │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                              Lexer                                │
│  - Input: source string                                          │
│  - Output: token stream                                          │
│  - Tracks line/column for error reporting                        │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                             Parser                                │
│  - Input: token stream                                           │
│  - Output: Abstract Syntax Tree (AST)                            │
│  - Recursive descent parser                                      │
│  - Produces clear syntax errors with locations                   │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Semantic Analyzer                            │
│  - Validates variable usage (declared before use)                │
│  - Checks function calls (declared before use, argument counts)  │
│  - Validates no variable shadowing                               │
│  - Validates loop variable not reassigned                        │
│  - Validates return statements in functions                      │
│  - Reports semantic errors with locations                        │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│        Interpreter          │   │        LSP Server           │
│  - Tree-walking execution   │   │  - Diagnostics (errors)     │
│  - Maintains environment    │   │  - Hover information        │
│  - Handles loop block       │   │  - Autocomplete             │
│  - Calls render backend     │   │  - Go to definition         │
└─────────────────────────────┘   └─────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Render Backend                             │
│  Option A: HTML Canvas (browser, live preview, animation)        │
│  Option B: node-canvas (server-side PNG generation)              │
│  Option C: SVG output (vector graphics, static only)             │
└──────────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. Lexer (`lexer.ts`)

Responsibilities:

- Convert source string to token stream
- Track position (line, column) for each token
- Handle comments (discard)
- Produce helpful errors for invalid characters

Token types:

```typescript
enum TokenType {
	// Literals
	NUMBER,
	STRING,
	TRUE,
	FALSE,
	IDENTIFIER,

	// Keywords
	LET,
	IF,
	ELSE,
	REPEAT,
	FUNC,
	RETURN,
	LOOP,
	NULL, // Reserved word (not a value, prevents use as identifier)

	// Operators
	PLUS,
	MINUS,
	STAR,
	SLASH,
	PERCENT,
	EQ,
	NEQ,
	LT,
	GT,
	LTE,
	GTE,
	AND,
	OR,
	NOT,
	ASSIGN,

	// Delimiters
	LPAREN,
	RPAREN,
	LBRACE,
	RBRACE,
	COMMA,
	SEMICOLON,

	// Special
	EOF,
}

interface Token {
	type: TokenType;
	lexeme: string;
	literal?: number | boolean | string;
	line: number;
	column: number;
}
```

#### 2. Parser (`parser.ts`)

Responsibilities:

- Consume token stream, produce AST
- Implement operator precedence via recursive descent
- Produce clear syntax error messages

AST Node types:

```typescript
interface Program {
	type: "Program";
	statements: Statement[];
	loopBlock?: LoopBlock;
}

type Statement =
	| VarDeclStmt
	| AssignmentStmt
	| IfStmt
	| RepeatStmt
	| FuncDeclStmt
	| ReturnStmt
	| ExprStmt;

interface VarDeclStmt {
	type: "VarDecl";
	name: string;
	initializer: Expression;
	location: SourceLocation;
}

interface AssignmentStmt {
	type: "Assignment";
	name: string;
	value: Expression;
	location: SourceLocation;
}

interface IfStmt {
	type: "If";
	condition: Expression;
	thenBranch: Statement[];
	elseBranch?: Statement[];
	location: SourceLocation;
}

interface RepeatStmt {
	type: "Repeat";
	variable: string;
	start: Expression;
	end: Expression;
	step?: Expression;
	body: Statement[];
	location: SourceLocation;
}

interface FuncDeclStmt {
	type: "FuncDecl";
	name: string;
	params: string[];
	body: Statement[];
	location: SourceLocation;
}

interface ReturnStmt {
	type: "Return";
	value?: Expression;
	location: SourceLocation;
}

interface ExprStmt {
	type: "ExprStmt";
	expression: Expression;
	location: SourceLocation;
}

interface LoopBlock {
	type: "LoopBlock";
	body: Statement[];
	location: SourceLocation;
}

type Expression =
	| NumberLiteral
	| StringLiteral
	| BooleanLiteral
	| Identifier
	| BinaryExpr
	| UnaryExpr
	| CallExpr;

interface StringLiteral {
	type: "StringLiteral";
	value: string;
	location: SourceLocation;
}

interface SourceLocation {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}
```

#### 3. Semantic Analyzer (`analyzer.ts`)

Responsibilities:

- Build a symbol table that distinguishes variables, parameters, repeat variables, functions, built-in functions, and built-in constants
- Reserve every top-level variable and function name across the whole program before source-order name resolution
- Check variables and functions are declared before use
- Reject reserved names at every declaration site
- Check declarations do not shadow visible names or program-wide global names
- Check names are not redeclared in the same scope
- Allow assignment only to variables and parameters
- Reject assignment to repeat variables, user functions, built-in functions, and built-in constants
- Report at most one primary diagnostic at each source location while continuing to collect independent diagnostics elsewhere
- Check loop variables not reassigned
- Validate all functions have return statements
- Validate built-in function calls (argument count and types where inferrable)

Errors to detect:

- `Cannot find name 'x'.`
- `Cannot declare 'PI' because that name is defined by GIC.`
- `Cannot declare 'x' because that name already exists.`
- `Cannot assign to function 'draw'.`
- `Cannot assign to 'PI' because that name is defined by GIC.`
- `Cannot assign to repeat variable 'i'.`
- `Function 'circle' expects 3 arguments, but got 2.`
- `Function 'foo' must have a return statement.`
- `Cannot return outside a function.`
- `Cannot call function 'foo' before its declaration.`
- `Cannot call 'item' because it is not a function.`
- `Function 'foo' cannot return both a value and no value.`
- `Function 'foo' does not return a value and cannot be used in an expression.`

#### 4. Interpreter (`interpreter.ts`)

Responsibilities:

- Execute AST via tree-walking
- Maintain environment (variable bindings)
- Handle scoping (global, function-local, and block-local)
- Execute user-defined functions with proper call stack
- Handle animation loop (if loop block present)
- Dispatch drawing commands to render backend

```typescript
type GicValue = number | boolean | string;

interface Environment {
	values: Map<string, GicValue>;
	parent?: Environment;
}

interface FunctionValue {
	params: string[];
	body: Statement[];
	kind: "value" | "void"; // Determined by semantic analysis
	closure: Environment; // Always global environment (no closures)
}

interface RenderBackend {
	// Canvas
	background(l: number, c: number, h: number): void;

	// Style
	fill(l: number, c: number, h: number, a?: number): void;
	noFill(): void;
	stroke(l: number, c: number, h: number, a?: number): void;
	noStroke(): void;
	strokeWidth(weight: number): void;

	// Shapes
	circle(x: number, y: number, radius: number): void;
	rect(x: number, y: number, width: number, height: number): void;
	line(x1: number, y1: number, x2: number, y2: number): void;
	ellipse(x: number, y: number, width: number, height: number): void;
	triangle(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
	): void;
	quad(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		x3: number,
		y3: number,
		x4: number,
		y4: number,
	): void;
	arc(
		x: number,
		y: number,
		radius: number,
		startAngle: number,
		endAngle: number,
	): void;
	point(x: number, y: number): void;

	// Animation
	startAnimationLoop(drawFrame: () => void, fps: number): void;
	stopAnimationLoop(): void;

	// Output
	getOutput(): Promise<Buffer | string>;
}
```

#### 5. Render Backends

**HTML Canvas Backend** (`backends/canvas.ts`)

- For browser-based live preview
- Supports animation via requestAnimationFrame
- Returns canvas element or data URL

**Node Canvas Backend** (`backends/node-canvas.ts`)

- For server-side rendering
- Uses `canvas` npm package
- Returns PNG buffer
- Animation: renders individual frames or GIF

**SVG Backend** (`backends/svg.ts`)

- For vector output
- Builds SVG XML string
- Static images only (no animation)

#### 6. LSP Server (`lsp/server.ts`)

Implements Language Server Protocol for editor integration.

Features to implement:

- **Diagnostics**: Parse errors, semantic errors (publish on document change)
- **Hover**: Show function signatures and descriptions
- **Completion**: Suggest built-in functions, user functions, and declared variables
- **Signature Help**: Show parameter info while typing function calls
- **Go to Definition**: Jump to function declarations

Use `vscode-languageserver` package for Node.js implementation.

---

## VS Code Extension

### Structure

```
gic-vscode/
├── package.json
├── language-configuration.json
├── syntaxes/
│   └── gic.tmLanguage.json
├── src/
│   └── extension.ts
└── server/
    └── (LSP server or bundled)
```

### package.json

```json
{
	"name": "gic-lang",
	"displayName": "gic",
	"description": "gic visual programming language support",
	"version": "0.1.0",
	"engines": {
		"vscode": "^1.80.0"
	},
	"categories": ["Programming Languages"],
	"activationEvents": ["onLanguage:gic"],
	"main": "./out/extension.js",
	"contributes": {
		"languages": [
			{
				"id": "gic",
				"aliases": ["gic", "gic"],
				"extensions": [".gic"],
				"configuration": "./language-configuration.json"
			}
		],
		"grammars": [
			{
				"language": "gic",
				"scopeName": "source.gic",
				"path": "./syntaxes/gic.tmLanguage.json"
			}
		],
		"commands": [
			{
				"command": "gic.run",
				"title": "gic: Run Program"
			}
		]
	}
}
```

### Syntax Highlighting

Create TextMate grammar for basic highlighting:

- Keywords: `let`, `if`, `else`, `repeat`, `func`, `return`, `loop`, `true`, `false`
- Built-in functions: all drawing and math functions
- Numbers, strings, comments, operators

### Live Preview Panel

Implement a WebView panel that:

1. Watches the active `.gic` file
2. Re-runs interpreter on save (or on keystroke with debounce)
3. Displays canvas output in panel
4. Supports animation playback
5. Shows runtime errors inline

---

## CLI Tool

Provide a command-line interface for running gic programs.

```bash
# Run and display in terminal (ASCII art fallback or open browser)
gic run sketch.gic

# Render to PNG (single frame, or first frame of animation)
gic render sketch.gic -o output.png

# Render animation to GIF
gic render sketch.gic -o output.gif --frames 60

# Render to SVG (static only)
gic render sketch.gic -o output.svg --format svg

# Check syntax without running
gic check sketch.gic

# Start LSP server (for editor integration)
gic lsp
```

---

## Example Programs

### 1. Hello Circle

```gic
// The simplest possible program
background(20, 0, 0);
fill(70, 60, 50);
circle(50, 50, 30);
```

### 2. Grid of Squares

```gic
background(15, 0, 0);
noStroke();

repeat(row, 0, 10) {
  repeat(col, 0, 10) {
    let x = col * 10;
    let y = row * 10;
    let lightness = (row + col) * 5;
    fill(lightness, 0, 0);
    rect(x + 1, y + 1, 8, 8);
  }
}
```

### 3. Concentric Circles

```gic
background(10, 0, 0);
noFill();
strokeWidth(1);

repeat(i, 0, 10) {
  let radius = i * 5;
  let hue = i * 36;
  stroke(60, 50, hue);
  circle(50, 50, radius);
}
```

### 4. Random Dots

```gic
randomSeed(42);
background(95, 5, 60);
noStroke();

repeat(i, 0, 100) {
  let x = random(0, 100);
  let y = random(0, 100);
  let size = random(1, 5);
  let l = random(40, 80);
  let c = random(30, 70);
  let h = random(180, 270);
  fill(l, c, h, 70);
  circle(x, y, size);
}
```

### 5. User-Defined Function

```gic
background(20, 0, 0);
noStroke();

func drawFlower(cx, cy, petalCount, size) {
  repeat(i, 0, petalCount) {
    let angle = (360 / petalCount) * i;
    let x = cx + cos(angle) * size;
    let y = cy + sin(angle) * size;
    fill(70, 60, angle);
    circle(x, y, size / 2);
  }
  fill(80, 70, 60);
  circle(cx, cy, size / 3);
  return;
}

drawFlower(25, 25, 6, 10);
drawFlower(75, 25, 8, 8);
drawFlower(50, 75, 5, 12);
```

### 6. Animated Circle

```gic
let angle = 0;

loop {
  background(10, 0, 0);

  let x = 50 + cos(angle) * 30;
  let y = 50 + sin(angle) * 30;

  fill(70, 50, angle % 360);
  noStroke();
  circle(x, y, 10);

  angle = angle + 3;
}
```

### 7. Animation with frameCount

```gic
loop {
  background(10, 0, 0);

  let x = 50 + cos(frameCount * 2) * 30;
  let y = 50 + sin(frameCount * 2) * 30;

  fill(70, 50, frameCount % 360);
  noStroke();
  circle(x, y, 10);
}
```

### 8. Animated Spiral

```gic
func drawSpiral(cx, cy, turns, speed) {
  repeat(i, 0, turns * 36) {
    let angle = i * 10 + frameCount * speed;
    let radius = i * 0.3;
    let x = cx + cos(angle) * radius;
    let y = cy + sin(angle) * radius;
    let hue = (i * 3 + frameCount) % 360;
    stroke(60, 50, hue);
    point(x, y);
  }
  return;
}

loop {
  background(5, 0, 0);
  noFill();
  strokeWidth(2);
  drawSpiral(50, 50, 5, 2);
}
```

---

## Error Message Guidelines

Errors should be:

- **Specific**: Point to exact location
- **Clear**: Use simple language
- **Helpful**: Suggest fixes when possible
- **Focused**: Report one primary diagnostic per source location and suppress dependent diagnostics caused by the same mistake

The analyzer continues after an error so that independent mistakes at other source locations are reported together. When one declaration violates several rules, conflicts with names defined by GIC take priority over other declaration conflicts.

### Examples

**Good error:**

```
Error at line 5, column 12:
  circle(50, 50)
             ^
  Function 'circle' requires 3 arguments (x, y, radius), but got 2.
```

**Bad error:**

```
Unexpected token
```

**Good error:**

```
Error at line 3, column 5:
  x = 10;
  ^
  Cannot find name 'x'.
```

**Good error (declaration conflict):**

```
Error at line 8, column 10:
  func draw(size) {
            ^^^^
  Cannot declare 'size' because that name already exists.
```

**Good error (call before declaration):**

```
Error at line 5, column 3:
  helper(10);
  ^^^^^^
  Cannot call function 'helper' before its declaration.
```

**Good error (void function in expression):**

```
Error at line 12, column 14:
  let x = drawSquare(10, 20, 5);
          ^^^^^^^^^^
  Function 'drawSquare' does not return a value and cannot be used in an expression.
```

---

## Testing Strategy

### Unit Tests

1. **Lexer tests**: Token output for various inputs, error cases
2. **Parser tests**: AST structure for valid programs, error messages for invalid
3. **Analyzer tests**: Semantic error detection (shadowing, undefined, etc.)
4. **Interpreter tests**: Execution results, environment handling, function calls

### Integration Tests

1. **End-to-end**: Source → rendered image comparison
2. **LSP tests**: Diagnostics, completions, hovers
3. **Animation tests**: Frame sequence validation

### Visual Regression Tests

Store reference images for example programs, compare rendered output.

---

## Project Structure

```
gic/
├── packages/
│   ├── core/                    # Lexer, parser, analyzer, interpreter
│   │   ├── src/
│   │   │   ├── lexer.ts
│   │   │   ├── parser.ts
│   │   │   ├── analyzer.ts
│   │   │   ├── interpreter.ts
│   │   │   └── types.ts
│   │   └── tests/
│   │
│   ├── backends/                # Render backends
│   │   ├── canvas/              # Browser canvas
│   │   ├── node-canvas/         # Server-side PNG
│   │   └── svg/                 # SVG output
│   │
│   ├── cli/                     # Command-line tool
│   │
│   ├── lsp/                     # Language server
│   │
│   └── vscode-extension/        # VS Code extension
│
├── examples/                    # Example programs
│
├── docs/                        # Documentation
│
└── tools/
    └── training-generator/      # LLM training data generator
```

---

## Additional Considerations

1. **Canvas coordinate system:** Top-left origin (web standard)
2. **Additional shapes?** Bezier curves? Polygons with arbitrary points? Not yet.
3. **Transformation?** Do we need transform functions like `rotate`, `translate` or `scale`? To be decided.
4. **No conditional loop (`while`):** gic deliberately has no `while` loop. `repeat` covers the vast majority of drawing patterns (grids, iterations, concentric shapes). Without `while`, all loops are guaranteed to terminate, which is valuable for an educational language and LLM-generated code. The awkward cases (random walks, iterative approximation) can be handled with recursion or `repeat` with an upper bound and a guard variable - both are less elegant, but these are edge cases for a drawing language. If a student outgrows `repeat`, that's the signal to move to p5.js. A `while` construct could be added later without conflicting with the existing grammar if this proves to be a real limitation in practice.
5. Can we make a a fuzzy version of the language? So we can write prompts to generate gic code without making the SLM generating gic code?

---

## References

- [Design by Numbers](https://mitpress.mit.edu/books/design-numbers) - John Maeda
- [Processing](https://processing.org/) - Ben Fry, Casey Reas
- [p5.js](https://p5js.org/) - Web-based Processing
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Crafting Interpreters](https://craftinginterpreters.com/) - Bob Nystrom (excellent resource for implementation)
