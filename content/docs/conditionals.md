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
