// ABOUTME: Maps GIC drawing built-in names to their command constructors.
// ABOUTME: Provides typed drawing-call dispatch for the interpreter.

import type { BuiltInKeys } from "../built-ins.ts";
import { background } from "./background.ts";
import { fill } from "./fill.ts";
import { noFill } from "./no-fill.ts";
import { noStroke } from "./no-stroke.ts";
import { stroke } from "./stroke.ts";
import { strokeWidth } from "./stroke-width.ts";
import { arc } from "./arc.ts";
import { circle } from "./circle.ts";
import { ellipse } from "./ellipse.ts";
import { line } from "./line.ts";
import { point } from "./point.ts";
import { quad } from "./quad.ts";
import { rect } from "./rect.ts";
import { triangle } from "./triangle.ts";
import type { DrawingCall } from "./drawing-types.ts";

export const drawingCalls: Partial<Record<BuiltInKeys, DrawingCall>> = {
	background,
	fill,
	noFill,
	noStroke,
	stroke,
	strokeWidth,
	point,
	line,
	arc,
	ellipse,
	circle,
	rect,
	quad,
	triangle,
};
