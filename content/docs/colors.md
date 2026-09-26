---
title: "Colors"
order: 2
---

### Hex Colors

You can define colors using hexadecimal values.

```gic
background("#ff6347");
```

### OKLCH Colors

You can also define colors using the OKLCH color space. The order is lightness, chroma, hue and an optional alpha channel.

```gic
background(50, 10. 200);
```

With alpha channel:

```gic
background(50, 10. 200, 10);
```

### Named Colors

You can also define colors using named values.

```gic
background("red");
```

You find a list of named colors in its [distinct tab](./colors-named.md).
