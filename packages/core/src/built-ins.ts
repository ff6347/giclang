// ABOUTME: Defines shared metadata for GIC built-in functions and constants.
// ABOUTME: Provides immutable signatures for analyzer and interpreter consumers.

import type { LiteralValue } from "./ast.ts";

export type BuiltInKeys =
	| "point"
	| "line"
	| "rect"
	| "circle"
	| "ellipse"
	| "triangle"
	| "quad"
	| "arc"
	| "fill"
	| "noFill"
	| "stroke"
	| "noStroke"
	| "strokeWidth"
	| "background"
	| "random"
	| "randomSeed"
	| "floor"
	| "ceil"
	| "round"
	| "abs"
	| "min"
	| "max"
	| "sqrt"
	| "pow"
	| "sin"
	| "cos"
	| "radians"
	| "degrees"
	| "print"
	| "PI"
	| "WIDTH"
	| "HEIGHT";

type Parameter = { readonly name: string; readonly kind: ValueKind };
export type ValueKind = "number" | "boolean" | "string";
type Signature = readonly Parameter[];
export type FunctionEntry = {
	readonly kind: "function";
	readonly signatures: readonly Signature[];
	readonly returnKind: "void" | "value";
};
type ConstantEntry = {
	readonly kind: "constant";
	readonly valueKind: ValueKind;
	readonly value: LiteralValue;
};
type BuiltInEntry = FunctionEntry | ConstantEntry;

type BuiltInRegistry = Readonly<Record<BuiltInKeys, BuiltInEntry>>;

export const builtInDescriptions: Readonly<Record<BuiltInKeys, string>> = {
	HEIGHT: "Canvas height in pixels.",
	PI: "The mathematical constant π.",
	WIDTH: "Canvas width in pixels.",
	abs: "Return the absolute value.",
	arc: "Draw an open clockwise arc using degrees.",
	background: "Fill the entire canvas with a color.",
	ceil: "Round a number up to an integer.",
	circle: "Draw a circle centered at (x, y).",
	cos: "Return the cosine of an angle in degrees.",
	ellipse: "Draw an ellipse centered at (x, y).",
	fill: "Set the fill color for subsequent shapes.",
	floor: "Round a number down to an integer.",
	line: "Draw a line between two points.",
	max: "Return the larger of two values.",
	min: "Return the smaller of two values.",
	noFill: "Disable fill for subsequent shapes.",
	noStroke: "Disable stroke for subsequent shapes.",
	point: "Draw a solid round point centered at (x, y).",
	pow: "Raise a base to an exponent.",
	print: "Write a value to the program output.",
	quad: "Draw a quadrilateral from four vertices.",
	random: "Return a random number between minimum and maximum.",
	randomSeed: "Set the seed used for reproducible random values.",
	rect: "Draw a rectangle from its top-left corner.",
	round: "Round a number to the nearest integer.",
	sin: "Return the sine of an angle in degrees.",
	radians: "Convert degrees to radians.",
	degrees: "Convert radians to degrees.",
	sqrt: "Return the square root of a number.",
	stroke: "Set the stroke color for subsequent shapes.",
	strokeWidth: "Set the stroke thickness in pixels.",
	triangle: "Draw a triangle from three vertices.",
};

const colorSignatures: readonly Signature[] = [
	[{ name: "value", kind: "string" }],
	[
		{ name: "lightness", kind: "number" },
		{ name: "chroma", kind: "number" },
		{ name: "hue", kind: "number" },
	],
	[
		{ name: "lightness", kind: "number" },
		{ name: "chroma", kind: "number" },
		{ name: "hue", kind: "number" },
		{ name: "alpha", kind: "number" },
	],
] as const satisfies readonly Signature[];
export const builtIns: BuiltInRegistry = {
	//constant
	WIDTH: {
		kind: "constant",
		valueKind: "number",
		value: 100,
	},
	HEIGHT: {
		kind: "constant",
		valueKind: "number",
		value: 100,
	},
	PI: {
		kind: "constant",
		valueKind: "number",
		value: Math.PI,
	},

	//color+ style
	background: {
		kind: "function",
		signatures: [...colorSignatures],
		returnKind: "void",
	},
	stroke: {
		kind: "function",
		signatures: [...colorSignatures],
		returnKind: "void",
	},
	noStroke: {
		kind: "function",
		signatures: [[]],
		returnKind: "void",
	},
	noFill: {
		kind: "function",
		signatures: [[]],
		returnKind: "void",
	},
	fill: {
		kind: "function",
		signatures: [...colorSignatures],
		returnKind: "void",
	},
	strokeWidth: {
		kind: "function",
		signatures: [[{ name: "width", kind: "number" }]],
		returnKind: "void",
	},
	//debug
	print: {
		kind: "function",
		signatures: [
			[{ name: "value", kind: "string" }],
			[{ name: "value", kind: "number" }],
			[{ name: "value", kind: "boolean" }],
		],
		returnKind: "void",
	},
	// form
	point: {
		kind: "function",
		signatures: [
			[
				{ name: "x", kind: "number" },
				{ name: "y", kind: "number" },
			],
		],
		returnKind: "void",
	},
	line: {
		kind: "function",
		signatures: [
			[
				{ name: "x1", kind: "number" },
				{ name: "y1", kind: "number" },
				{ name: "x2", kind: "number" },
				{ name: "y2", kind: "number" },
			],
		],
		returnKind: "void",
	},
	rect: {
		kind: "function",
		signatures: [
			[
				{ name: "x", kind: "number" },
				{ name: "y", kind: "number" },
				{ name: "width", kind: "number" },
				{ name: "height", kind: "number" },
			],
		],
		returnKind: "void",
	},

	circle: {
		kind: "function",
		signatures: [
			[
				{ name: "x", kind: "number" },
				{ name: "y", kind: "number" },
				{ name: "radius", kind: "number" },
			],
		],
		returnKind: "void",
	},
	ellipse: {
		kind: "function",
		signatures: [
			[
				{ name: "x", kind: "number" },
				{ name: "y", kind: "number" },
				{ name: "width", kind: "number" },
				{ name: "height", kind: "number" },
			],
		],
		returnKind: "void",
	},
	triangle: {
		kind: "function",
		signatures: [
			[
				{ name: "x1", kind: "number" },
				{ name: "y1", kind: "number" },
				{ name: "x2", kind: "number" },
				{ name: "y2", kind: "number" },
				{ name: "x3", kind: "number" },
				{ name: "y3", kind: "number" },
			],
		],
		returnKind: "void",
	},
	quad: {
		kind: "function",
		signatures: [
			[
				{ name: "x1", kind: "number" },
				{ name: "y1", kind: "number" },
				{ name: "x2", kind: "number" },
				{ name: "y2", kind: "number" },
				{ name: "x3", kind: "number" },
				{ name: "y3", kind: "number" },
				{ name: "x4", kind: "number" },
				{ name: "y4", kind: "number" },
			],
		],
		returnKind: "void",
	},
	arc: {
		kind: "function",
		signatures: [
			[
				{ name: "x", kind: "number" },
				{ name: "y", kind: "number" },
				{ name: "radius", kind: "number" },
				{ name: "startAngle", kind: "number" },
				{ name: "endAngle", kind: "number" },
			],
		],
		returnKind: "void",
	},
	// generators
	random: {
		kind: "function",
		signatures: [
			[
				{ name: "min", kind: "number" },
				{ name: "max", kind: "number" },
			],
		],
		returnKind: "value",
	},
	randomSeed: {
		kind: "function",
		signatures: [[{ name: "seed", kind: "number" }]],
		returnKind: "void",
	},
	// math
	floor: {
		kind: "function",
		signatures: [[{ name: "value", kind: "number" }]],
		returnKind: "value",
	},
	ceil: {
		kind: "function",
		signatures: [[{ name: "value", kind: "number" }]],
		returnKind: "value",
	},
	round: {
		kind: "function",
		signatures: [[{ name: "value", kind: "number" }]],
		returnKind: "value",
	},
	abs: {
		kind: "function",
		signatures: [[{ name: "value", kind: "number" }]],
		returnKind: "value",
	},
	min: {
		kind: "function",
		signatures: [
			[
				{ name: "a", kind: "number" },
				{ name: "b", kind: "number" },
			],
		],
		returnKind: "value",
	},
	max: {
		kind: "function",
		signatures: [
			[
				{ name: "a", kind: "number" },
				{ name: "b", kind: "number" },
			],
		],
		returnKind: "value",
	},
	sqrt: {
		kind: "function",
		signatures: [[{ name: "value", kind: "number" }]],
		returnKind: "value",
	},
	pow: {
		kind: "function",
		signatures: [
			[
				{ name: "base", kind: "number" },
				{ name: "exponent", kind: "number" },
			],
		],
		returnKind: "value",
	},
	sin: {
		kind: "function",
		signatures: [[{ name: "degrees", kind: "number" }]],
		returnKind: "value",
	},
	cos: {
		kind: "function",
		signatures: [[{ name: "degrees", kind: "number" }]],
		returnKind: "value",
	},
	radians: {
		kind: "function",
		signatures: [[{ name: "degrees", kind: "number" }]],
		returnKind: "value",
	},
	degrees: {
		kind: "function",
		signatures: [[{ name: "radians", kind: "number" }]],
		returnKind: "value",
	},
};

export function isBuiltInName(name: string): name is BuiltInKeys {
	return Object.hasOwn(builtIns, name);
}
