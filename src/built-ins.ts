// ABOUTME: Defines shared metadata for GIC built-in functions and constants.
// ABOUTME: Provides immutable signatures for analyzer and interpreter consumers.

type BuiltInKeys = "circle";
type ValueKind = "number" | "boolean" | "string";
type Signature = readonly ValueKind[];

type BuiltInEntry =
	| {
			readonly kind: "function";
			readonly signatures: readonly Signature[];
			readonly returnKind: "void" | "value";
	  }
	| {
			readonly kind: "constant";
	  };

type BuiltInRegistry = Readonly<Record<BuiltInKeys, BuiltInEntry>>;

export const builtIns: BuiltInRegistry = {
	circle: {
		kind: "function",
		signatures: [["number", "number", "number"]],
		returnKind: "void",
	},
} as const;
