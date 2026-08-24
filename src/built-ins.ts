// ABOUTME: Defines shared metadata for GIC built-in functions and constants.
// ABOUTME: Provides immutable signatures for analyzer and interpreter consumers.

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
	| "print"
	| "PI"
	| "WIDTH"
	| "HEIGHT";

type ValueKind = "number" | "boolean" | "string";
type Signature = readonly ValueKind[];
export type FunctionEntry = {
	readonly kind: "function";
	readonly signatures: readonly Signature[];
	readonly returnKind: "void" | "value";
};
type ConstantEntry = {
	readonly kind: "constant";
	readonly valueKind: ValueKind;
};
type BuiltInEntry = FunctionEntry | ConstantEntry;

type BuiltInRegistry = Readonly<Record<BuiltInKeys, BuiltInEntry>>;

const colorSignature: readonly Signature[] = [
	["string"],
	["number", "number", "number"],
	["number", "number", "number", "number"],
];
export const builtIns: BuiltInRegistry = {
	//constant
	WIDTH: {
		kind: "constant",
		valueKind: "number",
	},
	HEIGHT: {
		kind: "constant",
		valueKind: "number",
	},
	PI: {
		kind: "constant",
		valueKind: "number",
	},

	//color+ style
	background: {
		kind: "function",
		signatures: [...colorSignature],
		returnKind: "void",
	},
	stroke: {
		kind: "function",
		signatures: [...colorSignature],
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
		signatures: [...colorSignature],
		returnKind: "void",
	},
	strokeWidth: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "void",
	},
	//debug
	print: {
		kind: "function",
		signatures: [["string"], ["number"], ["boolean"]],
		returnKind: "void",
	},
	// form
	point: {
		kind: "function",
		signatures: [["number", "number"]],
		returnKind: "void",
	},
	line: {
		kind: "function",
		signatures: [["number", "number", "number", "number"]],
		returnKind: "void",
	},
	rect: {
		kind: "function",
		signatures: [["number", "number", "number", "number"]],
		returnKind: "void",
	},

	circle: {
		kind: "function",
		signatures: [["number", "number", "number"]],
		returnKind: "void",
	},
	ellipse: {
		kind: "function",
		signatures: [["number", "number", "number", "number"]],
		returnKind: "void",
	},
	triangle: {
		kind: "function",
		signatures: [["number", "number", "number", "number", "number", "number"]],
		returnKind: "void",
	},
	quad: {
		kind: "function",
		signatures: [
			[
				"number",
				"number",
				"number",
				"number",
				"number",
				"number",
				"number",
				"number",
			],
		],
		returnKind: "void",
	},
	arc: {
		kind: "function",
		signatures: [["number", "number", "number", "number", "number"]],
		returnKind: "void",
	},
	// generators
	random: {
		kind: "function",
		signatures: [["number", "number"]],
		returnKind: "value",
	},
	randomSeed: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "void",
	},
	// math
	floor: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	ceil: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	round: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	abs: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	min: {
		kind: "function",
		signatures: [["number", "number"]],
		returnKind: "value",
	},
	max: {
		kind: "function",
		signatures: [["number", "number"]],
		returnKind: "value",
	},
	sqrt: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	pow: {
		kind: "function",
		signatures: [["number", "number"]],
		returnKind: "value",
	},
	sin: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
	cos: {
		kind: "function",
		signatures: [["number"]],
		returnKind: "value",
	},
};

export function isBuiltInName(name: string): name is BuiltInKeys {
	return Object.hasOwn(builtIns, name);
}
