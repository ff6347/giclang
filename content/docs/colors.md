---
title: "Colors"
order: 2
---

There are three ways to define a color in GiC.

### Named Colors

Named colors are predefined color names that can be used directly in GIC.

```gic
fill("red");
```

There are 166 predefined colors available in GiC. These are the named colors defined in CSS. They are case-insensitive and just strings. Assigning them to a variable is possible

Basic colors have standard, memorable names:

| Keyword | RGB hex value | Sample |
| :-- | :-- | :-- |
| `black` | `#000000` | <span style="border:1px solid black; background-color: black;">black</span> |
| `silver` | `#c0c0c0` | <span style="border:1px solid black; background-color: silver;">silver</span> |
| `gray` | `#808080` | <span style="border:1px solid black; background-color: gray;">gray</span> |
| `white` | `#ffffff` | <span style="border:1px solid black; background-color: white;">white</span> |
| `maroon` | `#800000` | <span style="border:1px solid black; background-color: maroon;">maroon</span> |
| `red` | `#ff0000` | <span style="border:1px solid black; background-color: red;">red</span> |
| `purple` | `#800080` | <span style="border:1px solid black; background-color: purple;">purple</span> |
| `fuchsia` | `#ff00ff` | <span style="border:1px solid black; background-color: fuchsia;">fuchsia</span> |
| `green` | `#008000` | <span style="border:1px solid black; background-color: green;">green</span> |
| `lime` | `#00ff00` | <span style="border:1px solid black; background-color: lime;">lime</span> |
| `olive` | `#808000` | <span style="border:1px solid black; background-color: olive;">olive</span> |
| `yellow` | `#ffff00` | <span style="border:1px solid black; background-color: yellow;">yellow</span> |
| `navy` | `#000080` | <span style="border:1px solid black; background-color: navy;">navy</span> |
| `blue` | `#0000ff` | <span style="border:1px solid black; background-color: blue;">blue</span> |
| `teal` | `#008080` | <span style="border:1px solid black; background-color: teal;">teal</span> |
| `aqua` | `#00ffff` | <span style="border:1px solid black; background-color: aqua;">aqua</span> |

In addition to these 16 colors, about 150 other colors have a keyword associated to them:

| Keyword | RGB hex value | Sample |
| :-- | :-- | :-- |
| `aliceblue` | `#f0f8ff` | <span style="border:1px solid black; background-color: aliceblue;">aliceblue</span> |
| `antiquewhite` | `#faebd7` | <span style="border:1px solid black; background-color: antiquewhite;">antiquewhite</span> |
| `aqua` | `#00ffff` | <span style="border:1px solid black; background-color: aqua;">aqua</span> |
| `aquamarine` | `#7fffd4` | <span style="border:1px solid black; background-color: aquamarine;">aquamarine</span> |
| `azure` | `#f0ffff` | <span style="border:1px solid black; background-color: azure;">azure</span> |
| `beige` | `#f5f5dc` | <span style="border:1px solid black; background-color: beige;">beige</span> |
| `bisque` | `#ffe4c4` | <span style="border:1px solid black; background-color: bisque;">bisque</span> |
| `black` | `#000000` | <span style="border:1px solid black; background-color: black;">black</span> |
| `blanchedalmond` | `#ffebcd` | <span style="border:1px solid black; background-color: blanchedalmond;">blanchedalmond</span> |
| `blue` | `#0000ff` | <span style="border:1px solid black; background-color: blue;">blue</span> |
| `blueviolet` | `#8a2be2` | <span style="border:1px solid black; background-color: blueviolet;">blueviolet</span> |
| `brown` | `#a52a2a` | <span style="border:1px solid black; background-color: brown;">brown</span> |
| `burlywood` | `#deb887` | <span style="border:1px solid black; background-color: burlywood;">burlywood</span> |
| `cadetblue` | `#5f9ea0` | <span style="border:1px solid black; background-color: cadetblue;">cadetblue</span> |
| `chartreuse` | `#7fff00` | <span style="border:1px solid black; background-color: chartreuse;">chartreuse</span> |
| `chocolate` | `#d2691e` | <span style="border:1px solid black; background-color: chocolate;">chocolate</span> |
| `coral` | `#ff7f50` | <span style="border:1px solid black; background-color: coral;">coral</span> |
| `cornflowerblue` | `#6495ed` | <span style="border:1px solid black; background-color: cornflowerblue;">cornflowerblue</span> |
| `cornsilk` | `#fff8dc` | <span style="border:1px solid black; background-color: cornsilk;">cornsilk</span> |
| `crimson` | `#dc143c` | <span style="border:1px solid black; background-color: crimson;">crimson</span> |
| `cyan` | `#00ffff` (synonym of `aqua`) | <span style="border:1px solid black; background-color: cyan;">cyan</span> |
| `darkblue` | `#00008b` | <span style="border:1px solid black; background-color: darkblue;">darkblue</span> |
| `darkcyan` | `#008b8b` | <span style="border:1px solid black; background-color: darkcyan;">darkcyan</span> |
| `darkgoldenrod` | `#b8860b` | <span style="border:1px solid black; background-color: darkgoldenrod;">darkgoldenrod</span> |
| `darkgray` | `#a9a9a9` | <span style="border:1px solid black; background-color: darkgray;">darkgray</span> |
| `darkgreen` | `#006400` | <span style="border:1px solid black; background-color: darkgreen;">darkgreen</span> |
| `darkgrey` | `#a9a9a9` | <span style="border:1px solid black; background-color: darkgrey;">darkgrey</span> |
| `darkkhaki` | `#bdb76b` | <span style="border:1px solid black; background-color: darkkhaki;">darkkhaki</span> |
| `darkmagenta` | `#8b008b` | <span style="border:1px solid black; background-color: darkmagenta;">darkmagenta</span> |
| `darkolivegreen` | `#556b2f` | <span style="border:1px solid black; background-color: darkolivegreen;">darkolivegreen</span> |
| `darkorange` | `#ff8c00` | <span style="border:1px solid black; background-color: darkorange;">darkorange</span> |
| `darkorchid` | `#9932cc` | <span style="border:1px solid black; background-color: darkorchid;">darkorchid</span> |
| `darkred` | `#8b0000` | <span style="border:1px solid black; background-color: darkred;">darkred</span> |
| `darksalmon` | `#e9967a` | <span style="border:1px solid black; background-color: darksalmon;">darksalmon</span> |
| `darkseagreen` | `#8fbc8f` | <span style="border:1px solid black; background-color: darkseagreen;">darkseagreen</span> |
| `darkslateblue` | `#483d8b` | <span style="border:1px solid black; background-color: darkslateblue;">darkslateblue</span> |
| `darkslategray` | `#2f4f4f` | <span style="border:1px solid black; background-color: darkslategray;">darkslategray</span> |
| `darkslategrey` | `#2f4f4f` | <span style="border:1px solid black; background-color: darkslategrey;">darkslategrey</span> |
| `darkturquoise` | `#00ced1` | <span style="border:1px solid black; background-color: darkturquoise;">darkturquoise</span> |
| `darkviolet` | `#9400d3` | <span style="border:1px solid black; background-color: darkviolet;">darkviolet</span> |
| `deeppink` | `#ff1493` | <span style="border:1px solid black; background-color: deeppink;">deeppink</span> |
| `deepskyblue` | `#00bfff` | <span style="border:1px solid black; background-color: deepskyblue;">deepskyblue</span> |
| `dimgray` | `#696969` | <span style="border:1px solid black; background-color: dimgray;">dimgray</span> |
| `dimgrey` | `#696969` | <span style="border:1px solid black; background-color: dimgrey;">dimgrey</span> |
| `dodgerblue` | `#1e90ff` | <span style="border:1px solid black; background-color: dodgerblue;">dodgerblue</span> |
| `firebrick` | `#b22222` | <span style="border:1px solid black; background-color: firebrick;">firebrick</span> |
| `floralwhite` | `#fffaf0` | <span style="border:1px solid black; background-color: floralwhite;">floralwhite</span> |
| `forestgreen` | `#228b22` | <span style="border:1px solid black; background-color: forestgreen;">forestgreen</span> |
| `fuchsia` | `#ff00ff` | <span style="border:1px solid black; background-color: fuchsia;">fuchsia</span> |
| `gainsboro` | `#dcdcdc` | <span style="border:1px solid black; background-color: gainsboro;">gainsboro</span> |
| `ghostwhite` | `#f8f8ff` | <span style="border:1px solid black; background-color: ghostwhite;">ghostwhite</span> |
| `gold` | `#ffd700` | <span style="border:1px solid black; background-color: gold;">gold</span> |
| `goldenrod` | `#daa520` | <span style="border:1px solid black; background-color: goldenrod;">goldenrod</span> |
| `gray` | `#808080` | <span style="border:1px solid black; background-color: gray;">gray</span> |
| `green` | `#008000` | <span style="border:1px solid black; background-color: green;">green</span> |
| `greenyellow` | `#adff2f` | <span style="border:1px solid black; background-color: greenyellow;">greenyellow</span> |
| `grey` | `#808080` (synonym of `gray`) | <span style="border:1px solid black; background-color: grey;">grey</span> |
| `honeydew` | `#f0fff0` | <span style="border:1px solid black; background-color: honeydew;">honeydew</span> |
| `hotpink` | `#ff69b4` | <span style="border:1px solid black; background-color: hotpink;">hotpink</span> |
| `indianred` | `#cd5c5c` | <span style="border:1px solid black; background-color: indianred;">indianred</span> |
| `indigo` | `#4b0082` | <span style="border:1px solid black; background-color: indigo;">indigo</span> |
| `ivory` | `#fffff0` | <span style="border:1px solid black; background-color: ivory;">ivory</span> |
| `khaki` | `#f0e68c` | <span style="border:1px solid black; background-color: khaki;">khaki</span> |
| `lavender` | `#e6e6fa` | <span style="border:1px solid black; background-color: lavender;">lavender</span> |
| `lavenderblush` | `#fff0f5` | <span style="border:1px solid black; background-color: lavenderblush;">lavenderblush</span> |
| `lawngreen` | `#7cfc00` | <span style="border:1px solid black; background-color: lawngreen;">lawngreen</span> |
| `lemonchiffon` | `#fffacd` | <span style="border:1px solid black; background-color: lemonchiffon;">lemonchiffon</span> |
| `lightblue` | `#add8e6` | <span style="border:1px solid black; background-color: lightblue;">lightblue</span> |
| `lightcoral` | `#f08080` | <span style="border:1px solid black; background-color: lightcoral;">lightcoral</span> |
| `lightcyan` | `#e0ffff` | <span style="border:1px solid black; background-color: lightcyan;">lightcyan</span> |
| `lightgoldenrodyellow` | `#fafad2` | <span style="border:1px solid black; background-color: lightgoldenrodyellow;">lightgoldenrodyellow</span> |
| `lightgray` | `#d3d3d3` | <span style="border:1px solid black; background-color: lightgray;">lightgray</span> |
| `lightgreen` | `#90ee90` | <span style="border:1px solid black; background-color: lightgreen;">lightgreen</span> |
| `lightgrey` | `#d3d3d3` | <span style="border:1px solid black; background-color: lightgrey;">lightgrey</span> |
| `lightpink` | `#ffb6c1` | <span style="border:1px solid black; background-color: lightpink;">lightpink</span> |
| `lightsalmon` | `#ffa07a` | <span style="border:1px solid black; background-color: lightsalmon;">lightsalmon</span> |
| `lightseagreen` | `#20b2aa` | <span style="border:1px solid black; background-color: lightseagreen;">lightseagreen</span> |
| `lightskyblue` | `#87cefa` | <span style="border:1px solid black; background-color: lightskyblue;">lightskyblue</span> |
| `lightslategray` | `#778899` | <span style="border:1px solid black; background-color: lightslategray;">lightslategray</span> |
| `lightslategrey` | `#778899` | <span style="border:1px solid black; background-color: lightslategrey;">lightslategrey</span> |
| `lightsteelblue` | `#b0c4de` | <span style="border:1px solid black; background-color: lightsteelblue;">lightsteelblue</span> |
| `lightyellow` | `#ffffe0` | <span style="border:1px solid black; background-color: lightyellow;">lightyellow</span> |
| `lime` | `#00ff00` | <span style="border:1px solid black; background-color: lime;">lime</span> |
| `limegreen` | `#32cd32` | <span style="border:1px solid black; background-color: limegreen;">limegreen</span> |
| `linen` | `#faf0e6` | <span style="border:1px solid black; background-color: linen;">linen</span> |
| `magenta` | `#ff00ff` (synonym of `fuchsia`) | <span style="border:1px solid black; background-color: magenta;">magenta</span> |
| `maroon` | `#800000` | <span style="border:1px solid black; background-color: maroon;">maroon</span> |
| `mediumaquamarine` | `#66cdaa` | <span style="border:1px solid black; background-color: mediumaquamarine;">mediumaquamarine</span> |
| `mediumblue` | `#0000cd` | <span style="border:1px solid black; background-color: mediumblue;">mediumblue</span> |
| `mediumorchid` | `#ba55d3` | <span style="border:1px solid black; background-color: mediumorchid;">mediumorchid</span> |
| `mediumpurple` | `#9370db` | <span style="border:1px solid black; background-color: mediumpurple;">mediumpurple</span> |
| `mediumseagreen` | `#3cb371` | <span style="border:1px solid black; background-color: mediumseagreen;">mediumseagreen</span> |
| `mediumslateblue` | `#7b68ee` | <span style="border:1px solid black; background-color: mediumslateblue;">mediumslateblue</span> |
| `mediumspringgreen` | `#00fa9a` | <span style="border:1px solid black; background-color: mediumspringgreen;">mediumspringgreen</span> |
| `mediumturquoise` | `#48d1cc` | <span style="border:1px solid black; background-color: mediumturquoise;">mediumturquoise</span> |
| `mediumvioletred` | `#c71585` | <span style="border:1px solid black; background-color: mediumvioletred;">mediumvioletred</span> |
| `midnightblue` | `#191970` | <span style="border:1px solid black; background-color: midnightblue;">midnightblue</span> |
| `mintcream` | `#f5fffa` | <span style="border:1px solid black; background-color: mintcream;">mintcream</span> |
| `mistyrose` | `#ffe4e1` | <span style="border:1px solid black; background-color: mistyrose;">mistyrose</span> |
| `moccasin` | `#ffe4b5` | <span style="border:1px solid black; background-color: moccasin;">moccasin</span> |
| `navajowhite` | `#ffdead` | <span style="border:1px solid black; background-color: navajowhite;">navajowhite</span> |
| `navy` | `#000080` | <span style="border:1px solid black; background-color: navy;">navy</span> |
| `oldlace` | `#fdf5e6` | <span style="border:1px solid black; background-color: oldlace;">oldlace</span> |
| `olive` | `#808000` | <span style="border:1px solid black; background-color: olive;">olive</span> |
| `olivedrab` | `#6b8e23` | <span style="border:1px solid black; background-color: olivedrab;">olivedrab</span> |
| `orange` | `#ffa500` | <span style="border:1px solid black; background-color: orange;">orange</span> |
| `orangered` | `#ff4500` | <span style="border:1px solid black; background-color: orangered;">orangered</span> |
| `orchid` | `#da70d6` | <span style="border:1px solid black; background-color: orchid;">orchid</span> |
| `palegoldenrod` | `#eee8aa` | <span style="border:1px solid black; background-color: palegoldenrod;">palegoldenrod</span> |
| `palegreen` | `#98fb98` | <span style="border:1px solid black; background-color: palegreen;">palegreen</span> |
| `paleturquoise` | `#afeeee` | <span style="border:1px solid black; background-color: paleturquoise;">paleturquoise</span> |
| `palevioletred` | `#db7093` | <span style="border:1px solid black; background-color: palevioletred;">palevioletred</span> |
| `papayawhip` | `#ffefd5` | <span style="border:1px solid black; background-color: papayawhip;">papayawhip</span> |
| `peachpuff` | `#ffdab9` | <span style="border:1px solid black; background-color: peachpuff;">peachpuff</span> |
| `peru` | `#cd853f` | <span style="border:1px solid black; background-color: peru;">peru</span> |
| `pink` | `#ffc0cb` | <span style="border:1px solid black; background-color: pink;">pink</span> |
| `plum` | `#dda0dd` | <span style="border:1px solid black; background-color: plum;">plum</span> |
| `powderblue` | `#b0e0e6` | <span style="border:1px solid black; background-color: powderblue;">powderblue</span> |
| `purple` | `#800080` | <span style="border:1px solid black; background-color: purple;">purple</span> |
| `rebeccapurple` | `#663399` | <span style="border:1px solid black; background-color: rebeccapurple;">rebeccapurple</span> |
| `red` | `#ff0000` | <span style="border:1px solid black; background-color: red;">red</span> |
| `rosybrown` | `#bc8f8f` | <span style="border:1px solid black; background-color: rosybrown;">rosybrown</span> |
| `royalblue` | `#4169e1` | <span style="border:1px solid black; background-color: royalblue;">royalblue</span> |
| `saddlebrown` | `#8b4513` | <span style="border:1px solid black; background-color: saddlebrown;">saddlebrown</span> |
| `salmon` | `#fa8072` | <span style="border:1px solid black; background-color: salmon;">salmon</span> |
| `sandybrown` | `#f4a460` | <span style="border:1px solid black; background-color: sandybrown;">sandybrown</span> |
| `seagreen` | `#2e8b57` | <span style="border:1px solid black; background-color: seagreen;">seagreen</span> |
| `seashell` | `#fff5ee` | <span style="border:1px solid black; background-color: seashell;">seashell</span> |
| `sienna` | `#a0522d` | <span style="border:1px solid black; background-color: sienna;">sienna</span> |
| `silver` | `#c0c0c0` | <span style="border:1px solid black; background-color: silver;">silver</span> |
| `skyblue` | `#87ceeb` | <span style="border:1px solid black; background-color: skyblue;">skyblue</span> |
| `slateblue` | `#6a5acd` | <span style="border:1px solid black; background-color: slateblue;">slateblue</span> |
| `slategray` | `#708090` | <span style="border:1px solid black; background-color: slategray;">slategray</span> |
| `slategrey` | `#708090` | <span style="border:1px solid black; background-color: slategrey;">slategrey</span> |
| `snow` | `#fffafa` | <span style="border:1px solid black; background-color: snow;">snow</span> |
| `springgreen` | `#00ff7f` | <span style="border:1px solid black; background-color: springgreen;">springgreen</span> |
| `steelblue` | `#4682b4` | <span style="border:1px solid black; background-color: steelblue;">steelblue</span> |
| `tan` | `#d2b48c` | <span style="border:1px solid black; background-color: tan;">tan</span> |
| `teal` | `#008080` | <span style="border:1px solid black; background-color: teal;">teal</span> |
| `thistle` | `#d8bfd8` | <span style="border:1px solid black; background-color: thistle;">thistle</span> |
| `tomato` | `#ff6347` | <span style="border:1px solid black; background-color: tomato;">tomato</span> |
| `transparent` | See [transparent](#transparent). | <span style="border:1px solid black; background-color: transparent;">transparent</span> |
| `turquoise` | `#40e0d0` | <span style="border:1px solid black; background-color: turquoise;">turquoise</span> |
| `violet` | `#ee82ee` | <span style="border:1px solid black; background-color: violet;">violet</span> |
| `wheat` | `#f5deb3` | <span style="border:1px solid black; background-color: wheat;">wheat</span> |
| `white` | `#ffffff` | <span style="border:1px solid black; background-color: white;">white</span> |
| `whitesmoke` | `#f5f5f5` | <span style="border:1px solid black; background-color: whitesmoke;">whitesmoke</span> |
| `yellow` | `#ffff00` | <span style="border:1px solid black; background-color: yellow;">yellow</span> |
| `yellowgreen` | `#9acd32` | <span style="border:1px solid black; background-color: yellowgreen;">yellowgreen</span> |

(Table taken from [MDN CSS color keywords](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/named-color))

### Hex Colors

You also can define colors using hexadecimal values.

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
