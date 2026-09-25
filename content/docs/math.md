---
title: "Math"
order: 5
---

| Function | Description |
| :-- | :-- |
| `random(min, max)` | Random float between min (inclusive) and max (exclusive) |
| `randomSeed(n)` | Set random seed for reproducible outputs |
| `floor(n)` | Round down to integer |
| `ceil(n)` | Round up to integer |
| `round(n)` | Round to nearest integer |
| `abs(n)` | Absolute value |
| `min(a, b)` | Smaller of two values |
| `max(a, b)` | Larger of two values |
| `sin(degrees)` | Sine (input in degrees) |
| `cos(degrees)` | Cosine (input in degrees) |
| `sqrt(n)` | Square root |
| `pow(base, exp)` | Exponentiation |

All math arguments must be finite numbers, and math functions may return only finite numbers. `sqrt` rejects negative inputs. `pow` accepts negative bases and exponents when their result is finite and rejects infinite results.

`random(min, max)` requires `min < max`; equal or reversed bounds are errors. Before seeding, it uses ambient randomness. `randomSeed(seed)` converts the seed to an unsigned 32-bit integer and starts the p5.js-compatible 32-bit linear congruential sequence. Reseeding restarts that sequence, and random state belongs to one program run. Generated values are minimum-inclusive and maximum-exclusive.

**Note:** Trigonometric functions use degrees, not radians. This is more intuitive for beginners and matches the arc function.

### random(min, max)

Random float between min (inclusive) and max (exclusive).

```gic
let value = random(0, 1);
print(value);
```

### randomSeed(n)

Set random seed for reproducible outputs. This will make sure you get the same sequence of random numbers every time you run your program.

```gic
randomSeed(42);
let value = random(0, 1);
print(value);
```

### floor(n)

Round down to integer.

```gic
let value = floor(3.7);
print(value); // should print 3
```

### ceil(n)

Round up to integer

```gic
let value = ceil(3.7);
print(value); // should print 4
```

### round(n)

Round to nearest integer.

```gic
let value = round(3.7);
print(value); // should print 4
value = round(3.4);
print(value); // should print 3
```

### abs(n)

Absolute value

```gic
let value = abs(-3);
print(value); // should print 3
```

### min(a, b)

Smaller of two values

```gic
let value = min(3, 5);
print(value); // should print 3
```

### max(a, b)

Larger of two values

```gic
let value = max(3, 5);
print(value); // should print 5
```

### sin(degrees)

Sine (input in degrees)

```gic
repeat(degrees,0,360, 45) {
	let value = sin(degrees);
	print(value);
}
```

Sine cosine functions are great for describing arcs and circles. This uses polar coordinates to draw a circle.

```gic
strokeWidth(5);
repeat(degrees, 0, 360, 12) {
	let x = sin(degrees) * 25 + WIDTH / 2;
	let y = cos(degrees) * 25 + HEIGHT / 2;
	point(x, y);
}
```

### cos(degrees)

Cosine (input in degrees)

### sqrt(n)

Square root

### pow(base, exp)

Exponentiation

```

```
