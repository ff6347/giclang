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
| `black` | `#000000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: black;"></span> |
| `silver` | `#c0c0c0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: silver;"></span> |
| `gray` | `#808080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: gray;"></span> |
| `white` | `#ffffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: white;"></span> |
| `maroon` | `#800000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: maroon;"></span> |
| `red` | `#ff0000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: red;"></span> |
| `purple` | `#800080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: purple;"></span> |
| `fuchsia` | `#ff00ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: fuchsia;"></span> |
| `green` | `#008000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: green;"></span> |
| `lime` | `#00ff00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lime;"></span> |
| `olive` | `#808000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: olive;"></span> |
| `yellow` | `#ffff00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: yellow;"></span> |
| `navy` | `#000080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: navy;"></span> |
| `blue` | `#0000ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: blue;"></span> |
| `teal` | `#008080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: teal;"></span> |
| `aqua` | `#00ffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: aqua;"></span> |

In addition to these 16 colors, about 150 other colors have a keyword associated to them:

| Keyword | RGB hex value | Sample |
| :-- | :-- | :-- |
| `aliceblue` | `#f0f8ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: aliceblue;"></span> |
| `antiquewhite` | `#faebd7` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: antiquewhite;"></span> |
| `aqua` | `#00ffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: aqua;"></span> |
| `aquamarine` | `#7fffd4` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: aquamarine;"></span> |
| `azure` | `#f0ffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: azure;"></span> |
| `beige` | `#f5f5dc` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: beige;"></span> |
| `bisque` | `#ffe4c4` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: bisque;"></span> |
| `black` | `#000000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: black;"></span> |
| `blanchedalmond` | `#ffebcd` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: blanchedalmond;"></span> |
| `blue` | `#0000ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: blue;"></span> |
| `blueviolet` | `#8a2be2` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: blueviolet;"></span> |
| `brown` | `#a52a2a` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: brown;"></span> |
| `burlywood` | `#deb887` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: burlywood;"></span> |
| `cadetblue` | `#5f9ea0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: cadetblue;"></span> |
| `chartreuse` | `#7fff00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: chartreuse;"></span> |
| `chocolate` | `#d2691e` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: chocolate;"></span> |
| `coral` | `#ff7f50` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: coral;"></span> |
| `cornflowerblue` | `#6495ed` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: cornflowerblue;"></span> |
| `cornsilk` | `#fff8dc` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: cornsilk;"></span> |
| `crimson` | `#dc143c` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: crimson;"></span> |
| `cyan` | `#00ffff` (synonym of `aqua`) | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: cyan;"></span> |
| `darkblue` | `#00008b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkblue;"></span> |
| `darkcyan` | `#008b8b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkcyan;"></span> |
| `darkgoldenrod` | `#b8860b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkgoldenrod;"></span> |
| `darkgray` | `#a9a9a9` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkgray;"></span> |
| `darkgreen` | `#006400` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkgreen;"></span> |
| `darkgrey` | `#a9a9a9` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkgrey;"></span> |
| `darkkhaki` | `#bdb76b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkkhaki;"></span> |
| `darkmagenta` | `#8b008b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkmagenta;"></span> |
| `darkolivegreen` | `#556b2f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkolivegreen;"></span> |
| `darkorange` | `#ff8c00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkorange;"></span> |
| `darkorchid` | `#9932cc` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkorchid;"></span> |
| `darkred` | `#8b0000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkred;"></span> |
| `darksalmon` | `#e9967a` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darksalmon;"></span> |
| `darkseagreen` | `#8fbc8f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkseagreen;"></span> |
| `darkslateblue` | `#483d8b` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkslateblue;"></span> |
| `darkslategray` | `#2f4f4f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkslategray;"></span> |
| `darkslategrey` | `#2f4f4f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkslategrey;"></span> |
| `darkturquoise` | `#00ced1` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkturquoise;"></span> |
| `darkviolet` | `#9400d3` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: darkviolet;"></span> |
| `deeppink` | `#ff1493` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: deeppink;"></span> |
| `deepskyblue` | `#00bfff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: deepskyblue;"></span> |
| `dimgray` | `#696969` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: dimgray;"></span> |
| `dimgrey` | `#696969` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: dimgrey;"></span> |
| `dodgerblue` | `#1e90ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: dodgerblue;"></span> |
| `firebrick` | `#b22222` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: firebrick;"></span> |
| `floralwhite` | `#fffaf0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: floralwhite;"></span> |
| `forestgreen` | `#228b22` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: forestgreen;"></span> |
| `fuchsia` | `#ff00ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: fuchsia;"></span> |
| `gainsboro` | `#dcdcdc` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: gainsboro;"></span> |
| `ghostwhite` | `#f8f8ff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: ghostwhite;"></span> |
| `gold` | `#ffd700` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: gold;"></span> |
| `goldenrod` | `#daa520` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: goldenrod;"></span> |
| `gray` | `#808080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: gray;"></span> |
| `green` | `#008000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: green;"></span> |
| `greenyellow` | `#adff2f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: greenyellow;"></span> |
| `grey` | `#808080` (synonym of `gray`) | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: grey;"></span> |
| `honeydew` | `#f0fff0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: honeydew;"></span> |
| `hotpink` | `#ff69b4` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: hotpink;"></span> |
| `indianred` | `#cd5c5c` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: indianred;"></span> |
| `indigo` | `#4b0082` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: indigo;"></span> |
| `ivory` | `#fffff0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: ivory;"></span> |
| `khaki` | `#f0e68c` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: khaki;"></span> |
| `lavender` | `#e6e6fa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lavender;"></span> |
| `lavenderblush` | `#fff0f5` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lavenderblush;"></span> |
| `lawngreen` | `#7cfc00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lawngreen;"></span> |
| `lemonchiffon` | `#fffacd` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lemonchiffon;"></span> |
| `lightblue` | `#add8e6` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightblue;"></span> |
| `lightcoral` | `#f08080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightcoral;"></span> |
| `lightcyan` | `#e0ffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightcyan;"></span> |
| `lightgoldenrodyellow` | `#fafad2` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightgoldenrodyellow;"></span> |
| `lightgray` | `#d3d3d3` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightgray;"></span> |
| `lightgreen` | `#90ee90` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightgreen;"></span> |
| `lightgrey` | `#d3d3d3` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightgrey;"></span> |
| `lightpink` | `#ffb6c1` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightpink;"></span> |
| `lightsalmon` | `#ffa07a` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightsalmon;"></span> |
| `lightseagreen` | `#20b2aa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightseagreen;"></span> |
| `lightskyblue` | `#87cefa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightskyblue;"></span> |
| `lightslategray` | `#778899` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightslategray;"></span> |
| `lightslategrey` | `#778899` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightslategrey;"></span> |
| `lightsteelblue` | `#b0c4de` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightsteelblue;"></span> |
| `lightyellow` | `#ffffe0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lightyellow;"></span> |
| `lime` | `#00ff00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: lime;"></span> |
| `limegreen` | `#32cd32` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: limegreen;"></span> |
| `linen` | `#faf0e6` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: linen;"></span> |
| `magenta` | `#ff00ff` (synonym of `fuchsia`) | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: magenta;"></span> |
| `maroon` | `#800000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: maroon;"></span> |
| `mediumaquamarine` | `#66cdaa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumaquamarine;"></span> |
| `mediumblue` | `#0000cd` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumblue;"></span> |
| `mediumorchid` | `#ba55d3` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumorchid;"></span> |
| `mediumpurple` | `#9370db` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumpurple;"></span> |
| `mediumseagreen` | `#3cb371` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumseagreen;"></span> |
| `mediumslateblue` | `#7b68ee` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumslateblue;"></span> |
| `mediumspringgreen` | `#00fa9a` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumspringgreen;"></span> |
| `mediumturquoise` | `#48d1cc` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumturquoise;"></span> |
| `mediumvioletred` | `#c71585` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mediumvioletred;"></span> |
| `midnightblue` | `#191970` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: midnightblue;"></span> |
| `mintcream` | `#f5fffa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mintcream;"></span> |
| `mistyrose` | `#ffe4e1` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: mistyrose;"></span> |
| `moccasin` | `#ffe4b5` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: moccasin;"></span> |
| `navajowhite` | `#ffdead` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: navajowhite;"></span> |
| `navy` | `#000080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: navy;"></span> |
| `oldlace` | `#fdf5e6` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: oldlace;"></span> |
| `olive` | `#808000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: olive;"></span> |
| `olivedrab` | `#6b8e23` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: olivedrab;"></span> |
| `orange` | `#ffa500` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: orange;"></span> |
| `orangered` | `#ff4500` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: orangered;"></span> |
| `orchid` | `#da70d6` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: orchid;"></span> |
| `palegoldenrod` | `#eee8aa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: palegoldenrod;"></span> |
| `palegreen` | `#98fb98` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: palegreen;"></span> |
| `paleturquoise` | `#afeeee` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: paleturquoise;"></span> |
| `palevioletred` | `#db7093` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: palevioletred;"></span> |
| `papayawhip` | `#ffefd5` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: papayawhip;"></span> |
| `peachpuff` | `#ffdab9` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: peachpuff;"></span> |
| `peru` | `#cd853f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: peru;"></span> |
| `pink` | `#ffc0cb` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: pink;"></span> |
| `plum` | `#dda0dd` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: plum;"></span> |
| `powderblue` | `#b0e0e6` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: powderblue;"></span> |
| `purple` | `#800080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: purple;"></span> |
| `rebeccapurple` | `#663399` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: rebeccapurple;"></span> |
| `red` | `#ff0000` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: red;"></span> |
| `rosybrown` | `#bc8f8f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: rosybrown;"></span> |
| `royalblue` | `#4169e1` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: royalblue;"></span> |
| `saddlebrown` | `#8b4513` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: saddlebrown;"></span> |
| `salmon` | `#fa8072` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: salmon;"></span> |
| `sandybrown` | `#f4a460` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: sandybrown;"></span> |
| `seagreen` | `#2e8b57` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: seagreen;"></span> |
| `seashell` | `#fff5ee` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: seashell;"></span> |
| `sienna` | `#a0522d` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: sienna;"></span> |
| `silver` | `#c0c0c0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: silver;"></span> |
| `skyblue` | `#87ceeb` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: skyblue;"></span> |
| `slateblue` | `#6a5acd` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: slateblue;"></span> |
| `slategray` | `#708090` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: slategray;"></span> |
| `slategrey` | `#708090` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: slategrey;"></span> |
| `snow` | `#fffafa` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: snow;"></span> |
| `springgreen` | `#00ff7f` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: springgreen;"></span> |
| `steelblue` | `#4682b4` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: steelblue;"></span> |
| `tan` | `#d2b48c` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: tan;"></span> |
| `teal` | `#008080` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: teal;"></span> |
| `thistle` | `#d8bfd8` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: thistle;"></span> |
| `tomato` | `#ff6347` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: tomato;"></span> |
| `transparent` | See [transparent](#transparent). | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: transparent;"></span> |
| `turquoise` | `#40e0d0` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: turquoise;"></span> |
| `violet` | `#ee82ee` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: violet;"></span> |
| `wheat` | `#f5deb3` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: wheat;"></span> |
| `white` | `#ffffff` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: white;"></span> |
| `whitesmoke` | `#f5f5f5` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: whitesmoke;"></span> |
| `yellow` | `#ffff00` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: yellow;"></span> |
| `yellowgreen` | `#9acd32` | <span style="display:inline-block; width:4em; height:1em; border:1px solid black; background-color: yellowgreen;"></span> |

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
