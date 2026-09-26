---
title: "Conditionals"
order: 1
---

```gic
if (condition) {

} else if (other condition) {

} else {

}
```

### Comparison

All the comparisons below evaluate to `true` or `false`.

| Operator | Description           |
| :------- | :-------------------- |
| `==`     | Equal                 |
| `!=`     | Not equal             |
| `<`      | Less than             |
| `>`      | Greater than          |
| `<=`     | Less than or equal    |
| `>=`     | Greater than or equal |

#### Equality

```gic
let x = 1;
let y = 2;

if (x == y) {
    print("x is equal to y");
} else {
    print("x is not equal to y");
}
// or
if(x!=y) {
    print("x is not equal to y");
}

```

#### Less than or Greater than

```gic
let x = 1;
let y = 2;
if (x < y) {
    print("x is less than y");
} else {
    print("x is greater than y");
}
// or
if(x > y) {
    print("x is greater than y");
}
```

#### Less than or Greater than and Equal to

```gic
let x = 1;
let y = 2;
if (x <= y) {
    print("x is less than or equal to y");
} else {
    print("x is greater than y");
}
// or
if(x >= y) {
    print("x is greater than or equal to y");
}
```

#### Logical Operators

The above conditional statements can be combined or negated using logical operators.

| Operator | Description |
| :------- | :---------- |
| `&&`     | AND         |
| `\|\|`   | OR          |
| `!`      | NOT         |

#### And Operator

for example, if you wanted to check if `x` is greater than `y` and `z` is less than `y`, you could write:

```gic
let x = 1;
let y = 2;
let z = 3;
if (x > y && z < y) {
	print("x is greater than y and z is less than y");
} else {
	print("no that did not happen");
}
```

Only when both conditions are true, the `if` block will execute. For better readability, you can use parentheses to group conditions.

```gic
let x = 1;
let y = 2;
let z = 3;
if ((x > y) && (z < y)) {
    print("x is greater than y and z is less than y");
} else {
    print("no that did not happen");
}
```

Sometimes you will need the parentheses to make a specific condition evaluate first or to have several and conditions evaluate together.

```gic
let x = 1;
let y = 2;
let z = 3;
if ((x > y && z < y) && (y == 10)) {
    print("x is greater than y and z is less than y and y is 10");
} else {
    print("no that did not happen");
}
```

#### Or Operator

Sometimes you have to check if one condition is true or another is true.

```gic
let x = 1;
let y = 2;
let z = 3;
if (x > y || z < y) {
	print("x is greater than y or z is less than y");
} else {
	print("no that did not happen");
}
```

#### Not Operator

The `!` operator negates a condition.

```gic
let x = 1;
let y = 2;
if (!x > y) {
	print("x is not greater than y");
} else {
	print("no that did not happen");
}
```
