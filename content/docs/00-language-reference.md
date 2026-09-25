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
print("Hi");
```

### Output

The `print` function is used to output values to the on screen console.

```gic
print("Hi");
```

### Primitives values

- Numbers can be float `1.5` or integer `1`
- Strings `"Hello World"`
- Booleans `true` `false`

### Variables Declaration

Variables need to be initialized at declaration.

```gic
let x = 1;
```

Reassignment is allowed.

```gic
let x = 1;
x = 2;
```
