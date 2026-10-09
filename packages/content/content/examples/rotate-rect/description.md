---
title: Rotate Rect
order: 193
enabled: true
categories: [form]
tags: [rotation, quadrilaterals, figure-ground, contrast]
---

Adapted from [Rotate Rect](https://github.com/ff6347/gestalten-in-code/tree/e8b8f8446c13c01494ccfd1e92ce2bb1638daf66/form/2d/processing/rotate_rect), created by [Fabian Morón Zirfas](http://fabianmoronzirfas.me).

The user-defined `rotate(x, y, width, height, angle)` function draws a rectangle rotated around the canvas center. Its `x` and `y` describe the rectangle's center relative to that pivot, while `angle` is measured in degrees. Sine and cosine calculate the four corners before `quad` draws the shape.

A call at 13 degrees places a large white rectangle against a black ground. Its cropped edges make the tilted form read as a figure passing through the canvas. Change the angle in the call to explore the rotation.
