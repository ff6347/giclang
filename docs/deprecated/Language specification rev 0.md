# Gestalten In Code: A Visual Programming Language Specification

## Overview

**gic** is a minimal visual programming language designed for three purposes:

1. **Education**: Teach programming fundamentals to beginners with immediate visual feedback
2. **AI Art Generation**: Provide a constrained grammar suitable for training/fine-tuning small language models to generate visual art
3. **Artistic Commentary**: Serve as a medium for exploring the intersection of human creativity and machine generation

The language is inspired by Design by Numbers (John Maeda) and Processing (Ben Fry, Casey Reas), with an emphasis on simplicity, clarity, and a gentle learning curve toward tools like p5.js and Processing.

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

---

## Language Specification

### File Extension

`.gic`

### Comments

```gic
// Single line comment only
// No multi-line comment syntax (keeps grammar simple)
```

### Data Types

gic has only two data types:

| Type    | Description           | Examples                   |
| ------- | --------------------- | -------------------------- |
| Number  | 64-bit floating point | `42`, `3.14`, `-10`, `0.5` |
| Boolean | True or false         | `true`, `false`            |
| String  |                       | `"Hello World"`            |

There are no arrays, objects, null, or undefined.

### Variables

Variables are declared with `let` and can be reassigned:

```gic
let x = 50;
let y = 100;
x = x + 10;  // Reassignment allowed
```

**Constraints:**

- All variables must be initialized at declaration
- Variable names: start with letter or underscore, followed by letters, digits, or underscores
- No `const` or `var` keywords

**Reserved words cannot be used as variable names:**
`let`, `if`, `else`, `repeat`, `true`, `false`, and all built-in function names.

### Operators

#### Arithmetic

| Operator | Description                               |
| -------- | ----------------------------------------- |
| `+`      | Addition                                  |
| `-`      | Subtraction (binary) and negation (unary) |
| `*`      | Multiplication                            |
| `/`      | Division                                  |
| `%`      | Modulo                                    |

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
| `        |                     |
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

#### Loops

gic has one loop construct: `repeat`

```gic
// repeat(variable, start, end) - iterates from start to end (exclusive)
repeat(i, 0, 10) {
  circle(i * 10, 50, 5);
}
```

This is equivalent to `for (let i = 0; i < 10; i++)` in JavaScript.

**Constraints:**

- Loop variable is scoped to the loop body
- Loop variable cannot be reassigned within the loop
- `start` and `end` must be expressions that evaluate to numbers
- No `while`, `for`, `do-while`, or `break`/`continue`

---

## Built-in Functions

### Canvas Setup

The canvas is always 101 pixel wide and heigh so the canvas has a visual center.

| Function                                                          | Description                                  | Default         |
| ----------------------------------------------------------------- | -------------------------------------------- | --------------- |
|                                                                   |                                              |                 |
| `background(l, c, h);`                                            | Fill entire canvas with color in oklch space | Black (0, 0, 0) |
|                                                                   |                                              |                 |
| `background()` can be called multiple times (clears and repaints) |

### Colors

- gic uses by default the OKLCH color space
- Color functions are overloaded
  - Color values are lightness (0-100%) chroma (0-100%) hue 360° (OKLCH)
  - Colors can also be hex values `#ff6347`
  - Colors can also be named CSS colors `tomato`

### Shape Style

Style functions set the current drawing style. They affect all subsequent shapes until changed.

| Function               | Description                       | Default               |
| ---------------------- | --------------------------------- | --------------------- |
| `fill(r, g, b);`       | Set fill color for shapes         | White (255, 255, 255) |
| `fill(r, g, b, a);`    | Set fill color with alpha (0-255) | —                     |
| `noFill();`            | Disable fill                      | —                     |
| `stroke(r, g, b);`     | Set stroke (outline) color        | Black (0, 0, 0)       |
| `stroke(r, g, b, a);`  | Set stroke color with alpha       | —                     |
| `noStroke();`          | Disable stroke                    | —                     |
| `strokeWidth(weight);` | Set stroke thickness in pixels    | 1                     |

### Shape Drawing

All coordinates are in pixels from top-left origin (0, 0).

| Function                                   | Description                                        |
| ------------------------------------------ | -------------------------------------------------- |
| `point(x, y);`                             | Draw a single point                                |
| `line(x1, y1, x2, y2);`                    | Draw line from (x1, y1) to (x2, y2)                |
| `rect(x, y, width, height);`               | Draw rectangle, (x, y) is top-left corner          |
| `circle(x, y, radius);`                    | Draw circle centered at (x, y)                     |
| `ellipse(x, y, width, height);`            | Draw ellipse centered at (x, y)                    |
| `triangle(x1, y1, x2, y2, x3, y3);`        | Draw triangle with three vertices                  |
| `quad(x1, y1, x2, y2, x3, y3, x4, y4);`    | Draw quadrilateral with four vertices              |
| `arc(x, y, radius, startAngle, endAngle);` | Draw arc (angles in degrees, 0 = right, clockwise) |

### Math Functions

| Function           | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `random(min, max)` | Random float between min (inclusive) and max (exclusive) |
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

| Name     | Value         | Description                    |
| -------- | ------------- | ------------------------------ |
| `PI`     | 3.14159…      | Mathematical constant          |
| `WIDTH`  | Canvas width  | Set by `size()` or default 400 |
| `HEIGHT` | Canvas height | Set by `size()` or default 400 |

---

## Grammar (EBNF)

```ebnf
program        = statement* ;

statement      = varDecl
               | assignment
               | ifStmt
               | repeatStmt
               | exprStmt ;

varDecl        = "let" IDENTIFIER "=" expression ";" ;
assignment     = IDENTIFIER "=" expression ";" ;

ifStmt         = "if" "(" expression ")" block
                 ( "else" "if" "(" expression ")" block )*
                 ( "else" block )? ;

repeatStmt     = "repeat" "(" IDENTIFIER "," expression "," expression ")" block ;

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
primary        = NUMBER | "true" | "false" | IDENTIFIER | "(" expression ")" ;

IDENTIFIER     = [a-zA-Z_][a-zA-Z0-9_]* ;
NUMBER         = [0-9]+ ( "." [0-9]+ )? ;
```

---

## Implementation Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Source File (.gic)                      │
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
│  - Checks function argument counts                               │
│  - Validates loop variable not reassigned                        │
│  - Reports semantic errors with locations                        │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│        Interpreter          │   │        LSP Server           │
│  - Tree-walking execution   │   │  - Diagnostics (errors)     │
│  - Maintains environment    │   │  - Hover information        │
│  - Calls render backend     │   │  - Autocomplete             │
└─────────────────────────────┘   │  - Go to definition         │
                │                 └─────────────────────────────┘
                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Render Backend                             │
│  Option A: HTML Canvas (browser, live preview)                   │
│  Option B: node-canvas (server-side PNG generation)              │
│  Option C: SVG output (vector graphics)                          │
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
	TRUE,
	FALSE,
	IDENTIFIER,

	// Keywords
	LET,
	IF,
	ELSE,
	REPEAT,

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
	literal?: number | boolean;
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
type Statement = VarDeclStmt | AssignmentStmt | IfStmt | RepeatStmt | ExprStmt;

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
	body: Statement[];
	location: SourceLocation;
}

interface ExprStmt {
	type: "ExprStmt";
	expression: Expression;
	location: SourceLocation;
}

type Expression =
	| NumberLiteral
	| BooleanLiteral
	| Identifier
	| BinaryExpr
	| UnaryExpr
	| CallExpr;

interface SourceLocation {
	startLine: number;
	startColumn: number;
	endLine: number;
	endColumn: number;
}
```

#### 3. Semantic Analyzer (`analyzer.ts`)

Responsibilities:

- Build symbol table
- Check variables declared before use
- Check variables not redeclared in same scope
- Check loop variables not reassigned
- Validate built-in function calls (argument count and types where inferrable)
- Ensure `size()` is first statement if present

Errors to detect:

- `Undefined variable 'x'`
- `Variable 'x' already declared in this scope`
- `Cannot reassign loop variable 'i'`
- `Function 'circle' expects 3 arguments, got 2`
- `'size' must be the first statement in the program`

#### 4. Interpreter (`interpreter.ts`)

Responsibilities:

- Execute AST via tree-walking
- Maintain environment (variable bindings)
- Handle scoping (blocks, loops)
- Dispatch drawing commands to render backend

```typescript
interface Environment {
	values: Map<string, number | boolean>;
	parent?: Environment;
}

interface RenderBackend {
	size(width: number, height: number): void;
	background(r: number, g: number, b: number): void;
	fill(r: number, g: number, b: number, a?: number): void;
	noFill(): void;
	stroke(r: number, g: number, b: number, a?: number): void;
	noStroke(): void;
	strokeWidth(weight: number): void;
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
	getOutput(): Promise<Buffer | string>; // PNG buffer or SVG string
}
```

#### 5. Render Backends

**HTML Canvas Backend** (`backends/canvas.ts`)

- For browser-based live preview
- Returns canvas element or data URL

**Node Canvas Backend** (`backends/node-canvas.ts`)

- For server-side rendering
- Uses `canvas` npm package
- Returns PNG buffer

**SVG Backend** (`backends/svg.ts`)

- For vector output
- Builds SVG XML string

#### 6. LSP Server (`lsp/server.ts`)

Implements Language Server Protocol for editor integration.

Features to implement:

- **Diagnostics**: Parse errors, semantic errors (publish on document change)
- **Hover**: Show function signatures and descriptions
- **Completion**: Suggest built-in functions and declared variables
- **Signature Help**: Show parameter info while typing function calls

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

- Keywords: `let`, `if`, `else`, `repeat`, `true`, `false`
- Built-in functions: all drawing and math functions
- Numbers, comments, operators

### Live Preview Panel

Implement a WebView panel that:

1. Watches the active `.gic` file
2. Re-runs interpreter on save (or on keystroke with debounce)
3. Displays canvas output in panel
4. Shows runtime errors inline

---

## CLI Tool

Provide a command-line interface for running gic programs.

```bash
# Run and display in terminal (ASCII art fallback or open browser)
gic run sketch.gic

# Render to PNG
gic render sketch.gic -o output.png

# Render to SVG
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
background(40, 40, 50);
fill(255, 200, 100);
circle(200, 200, 80);
```

### 2. Grid of Squares

```gic
size(400, 400);
background(20, 20, 30);
noStroke();

repeat(row, 0, 10) {
  repeat(col, 0, 10) {
    let x = col * 40;
    let y = row * 40;
    let brightness = (row + col) * 12;
    fill(brightness, brightness, brightness + 50);
    rect(x + 2, y + 2, 36, 36);
  }
}
```

### 3. Concentric Circles

```gic
size(400, 400);
background(10, 10, 20);
noFill();
strokeWidth(2);

repeat(i, 0, 20) {
  let radius = i * 10;
  let hue = i * 12;
  stroke(255 - hue, hue, 150);
  circle(200, 200, radius);
}
```

### 4. Random Dots

```gic
size(400, 400);
background(250, 250, 245);
noStroke();

repeat(i, 0, 200) {
  let x = random(0, 400);
  let y = random(0, 400);
  let size = random(2, 15);
  let r = random(100, 255);
  let g = random(50, 150);
  let b = random(100, 200);
  fill(r, g, b, 180);
  circle(x, y, size);
}
```

### 5. Conditional Coloring

```gic
size(400, 400);
background(30, 30, 40);
noStroke();

repeat(i, 0, 400) {
  let x = random(0, 400);
  let y = random(0, 400);

  if (x < 200) {
    if (y < 200) {
      fill(255, 100, 100);
    } else {
      fill(100, 255, 100);
    }
  } else {
    if (y < 200) {
      fill(100, 100, 255);
    } else {
      fill(255, 255, 100);
    }
  }

  circle(x, y, 5);
}
```

### 6. Spiral

```gic
size(400, 400);
background(15, 15, 25);
noFill();
strokeWidth(1);

let cx = 200;
let cy = 200;

repeat(i, 0, 360) {
  let angle = i * 3;
  let radius = i * 0.5;
  let x = cx + cos(angle) * radius;
  let y = cy + sin(angle) * radius;

  let brightness = 255 - i * 0.7;
  stroke(brightness, brightness * 0.6, 255);
  circle(x, y, 3);
}
```

---

## LLM Training Data Generation

### Strategy

Generate thousands of valid gic programs programmatically to create a training dataset. The small grammar makes this tractable.

### Generator Approach

```typescript
// Pseudocode for training data generator

function generateProgram(): string {
	const statements: string[] = [];

	// Always start with size and background
	statements.push(generateSize());
	statements.push(generateBackground());

	// Random style setup
	if (random() > 0.5) statements.push(generateFill());
	if (random() > 0.5) statements.push(generateStroke());

	// Generate 5-20 drawing operations
	const opCount = randomInt(5, 20);
	repeat(opCount, () => {
		const choice = random();
		if (choice < 0.3) {
			statements.push(generateLoop());
		} else if (choice < 0.5) {
			statements.push(generateConditional());
		} else {
			statements.push(generateShape());
		}
	});

	return statements.join("\n");
}
```

### Dataset Structure

```
training-data/
├── programs/
│   ├── 000001.gic
│   ├── 000002.gic
│   └── ...
├── images/
│   ├── 000001.png
│   ├── 000002.png
│   └── ...
└── metadata.jsonl
```

Each line in `metadata.jsonl`:

```json
{
	"id": "000001",
	"program": "background(40,40,50);...",
	"features": ["loop", "gradient"]
}
```

### Training Approaches

1. **Code completion**: Given partial program, predict next tokens
2. **Code generation**: Given description or image, generate program
3. **Program variation**: Given program, generate variations

---

## Error Message Guidelines

Errors should be:

- **Specific**: Point to exact location
- **Clear**: Use simple language
- **Helpful**: Suggest fixes when possible

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
  Variable 'x' is not declared. Did you mean to use 'let x = 10;'?
```

---

## Testing Strategy

### Unit Tests

1. **Lexer tests**: Token output for various inputs, error cases
2. **Parser tests**: AST structure for valid programs, error messages for invalid
3. **Analyzer tests**: Semantic error detection
4. **Interpreter tests**: Execution results, environment handling

### Integration Tests

1. **End-to-end**: Source → rendered image comparison
2. **LSP tests**: Diagnostics, completions, hovers

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

## Implementation Phases

### Phase 1: Core Language (Week 1-2)

- [ ] Lexer with full token set
- [ ] Parser producing AST
- [ ] Semantic analyzer
- [ ] Basic interpreter
- [ ] Node-canvas backend
- [ ] CLI tool (run, render)

### Phase 2: Editor Support (Week 3)

- [ ] LSP server with diagnostics
- [ ] VS Code extension with syntax highlighting
- [ ] Live preview panel

### Phase 3: Polish (Week 4)

- [ ] Comprehensive error messages
- [ ] All example programs working
- [ ] Documentation
- [ ] Test suite

### Phase 4: LLM Training (Week 5+)

- [ ] Training data generator
- [ ] Generate 10,000+ programs
- [ ] Render all to images
- [ ] Fine-tuning experiments

---

## Open Questions for Discussion

1. **Animation support?** Should we add a `draw()` loop for animations, or keep it static-only for simplicity?
2. **Color modes?** Should we support HSB in addition to RGB? (e.g., `fillHSB(hue, sat, brightness)`)
3. **Canvas coordinate system?** Top-left origin (web standard) or bottom-left (math standard)?
4. **Additional shapes?** Bezier curves? Polygons with arbitrary points?
5. **Image loading?** Should programs be able to load and draw images, or stay pure generative?
6. **Random seed?** Should we expose `randomSeed(n)` for reproducible outputs?

---

## References

- [Design by Numbers](https://mitpress.mit.edu/books/design-numbers) - John Maeda
- [Processing](https://processing.org/) - Ben Fry, Casey Reas
- [p5.js](https://p5js.org/) - Web-based Processing
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
- [Crafting Interpreters](https://craftinginterpreters.com/) - Bob Nystrom (excellent resource for implementation)
