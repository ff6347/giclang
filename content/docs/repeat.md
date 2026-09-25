---
title: Repeat a.k.a. Loops
order: 3
---

A loop consists out of a local variable that can be used as aloop counter, a start value, an end value, excluding the value and an optional step value in which The local variable should be increased or decreased. It is declared using the `repeat` keyword.

```gic
repeat (local variable, start, end, step) {

}
```

For example:

```gic
repeat(counter, 0, 10) {
	print(counter);
}
```

Would output:

```plain
Line 2: 0
Line 2: 1
Line 2: 2
Line 2: 3
Line 2: 4
Line 2: 5
Line 2: 6
Line 2: 7
Line 2: 8
Line 2: 9
```

to the output panel.

```gic
repeat(counter, 0, 10, 2) {
	print(counter);
}
```

Prints the following to the output panel.

```plain
Line 2: 0
Line 2: 2
Line 2: 4
Line 2: 6
Line 2: 8
```
