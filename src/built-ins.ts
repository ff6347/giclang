// ABOUTME: Defines shared metadata for GIC built-in functions and constants.
// ABOUTME: Provides immutable signatures for analyzer and interpreter consumers.

type BuiltInKeys = "circle" | "fill" | "PI";
type ValueKind = "number" | "boolean" | "string";
type Signature = readonly ValueKind[];
type FunctionEntry = {
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

export const builtIns: BuiltInRegistry = {
	PI: {
		kind: "constant",
		valueKind: "number",
	},
	circle: {
		kind: "function",
		signatures: [["number", "number", "number"]],
		returnKind: "void",
	},
	fill: {
		kind: "function",
		signatures: [
			["string"],
			["number", "number", "number"],
			["number", "number", "number", "number"],
		],
		returnKind: "void",
	},
};
