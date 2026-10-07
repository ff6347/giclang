# GiC language reference

GiC (Gestalten in Code) is a small C-style language for two-dimensional generative graphics. Source files use the `.gic` extension. Sketches run top to bottom once; animation is outside the core static language.

## Values

- Number (64-bit float), Boolean (`true` / `false`), String (double quotes).
- No arrays, objects, or null.

## Comments

`//` single-line comments only.

## Variables

```gic
let x = 50;
x = x + 10;
```

- Declared with `let` and must be initialized.
- Reassignment is allowed; there is no `const` or `var`.
- Names start with a letter or underscore, then letters, digits, or underscores.
- Declarations must precede use (no hoisting).
- Reserved names (keywords and built-ins) cannot be declared.
- `if`, `else`, and `repeat` bodies create block scopes; names declared inside them are unavailable afterward.
- Declarations cannot shadow names visible in an enclosing scope. Global names are reserved throughout the program, even before their declarations.

## Operators

- Arithmetic: `+ - * / %`; `+` also concatenates strings.
- Comparison: `== != < > <= >=`.
- Logical: `&& || !`.
- Precedence (high to low): `!`/unary `-`, `* / %`, `+ -`, `< > <= >=`, `== !=`, `&&`, `||`.
- `+` requires two Numbers or two Strings; there is no implicit conversion. Other arithmetic and ordered comparisons require Numbers; division and modulo by zero fail. Equality compares without coercion.
- `if` conditions and logical operators use Booleans only; `&&` and `||` short-circuit.

## Control flow

```gic
if (condition) {
  // statements
} else if (otherCondition) {
  // statements
} else {
  // statements
}

repeat(i, 0, 10) {
  circle(i * 10, 50, 5);
}

repeat(i, 10, 0, -1) {
  circle(i * 10, 50, 5);
}
```

- `if` braces are always required; no ternary, no `switch`.
- `repeat(variable, start, end)` and `repeat(variable, start, end, step)` iterate from start to end, exclusive. Step defaults to `1` and must not be `0`.
- `start`, `end`, and `step` must evaluate to Numbers; each is evaluated once before iteration. A positive step runs while the variable is less than `end`; a negative step runs while it is greater. A step pointing away from `end` gives zero iterations.
- The repeat variable is scoped to the body and cannot be reassigned.
- There is no `while`, `for`, or `break`/`continue`.

## Functions

```gic
func multiply(x, y) {
  return x * y;
}

func drawSquare(x, y, size) {
  rect(x, y, size, size);
  return;
}
```

- Declared with `func` at global scope, before use; recursion is allowed.
- Every function needs an explicit `return expression;` (value) or `return;` (void).
- A function cannot mix value and void returns.
- Void calls (drawing, `print`, `randomSeed`, and void functions) only stand alone.

## Canvas and colors

- The canvas viewport is 100 x 100 pixels; origin `(0, 0)` is top-left; center is `(50, 50)`. Drawing coordinates and sizes are not restricted to the viewport.
- `background`, `fill`, and `stroke` each accept a CSS color String, OKLCH `(lightness, chroma, hue)`, or OKLCH with alpha `(lightness, chroma, hue, alpha)`.
- Lightness, chroma, and alpha range from 0 to 100 inclusive; hue ranges from 0 to 360 inclusive.
- Hex (`fill("#ff6347")`) and named CSS colors (`fill("tomato")`) are accepted.
- Style functions: `fill`, `noFill()`, `stroke`, `noStroke()`, `strokeWidth(width)`.
- Style persists until changed.

## Drawing

All coordinates are pixels from the top-left origin.

```gic
point(x, y);
line(x1, y1, x2, y2);
rect(x, y, width, height);
circle(x, y, radius);
ellipse(x, y, width, height);
triangle(x1, y1, x2, y2, x3, y3);
quad(x1, y1, x2, y2, x3, y3, x4, y4);
arc(x, y, radius, startAngle, endAngle);
```

- `rect`, `circle`, `ellipse`, `triangle`, and `quad` use the current fill and stroke.
- `point`, `line`, and `arc` use only the current stroke.
- `arc` angles are in degrees, clockwise from the right, and arcs remain open.

## Output

`print(value1, value2, ...);` writes zero or more Number, Boolean, or String values to the console. For example, `print();` writes no values.

## Math and constants

- `random(min, max)` returns a float in `[min, max)` and requires `min < max`.
- `randomSeed(n)` makes `random` reproducible.
- `floor(n)` `ceil(n)` `round(n)` `abs(n)` `min(a, b)` `max(a, b)`.
- `sin(degrees)` `cos(degrees)` `sqrt(n)` `pow(base, exp)`.
- `radians(degrees)` `degrees(radian)`.
- Trigonometric functions use degrees.
- Math arguments and results must be finite. `sqrt` rejects negative inputs; `pow` rejects non-finite results.
- Constants: `PI`, `WIDTH` (100), `HEIGHT` (100).

## Keywords and reserved names

`let if else repeat func return loop true false null` plus every built-in and constant name. These cannot be used as variable, function, parameter, or repeat variable names.

`loop` is reserved, but the static interpreter does not execute a `loop` block; do not rely on it for drawing.
