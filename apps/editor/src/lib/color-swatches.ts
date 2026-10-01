// ABOUTME: Finds CSS colors in supported GIC drawing-call arguments.
// ABOUTME: Returns source ranges suitable for Monaco color decorations.

import { colornames } from "@giclang/core/color-names";

const COLOR_FUNCTIONS = new Set(["background", "fill", "stroke"]);
type SourceToken = {
	type:
		| "identifier"
		| "string"
		| "left-paren"
		| "right-paren"
		| "comma"
		| "other";
	value: string;
	start: number;
	end: number;
};

export interface ColorRange {
	color: string;
	start: number;
	end: number;
}

export function colorRanges(source: string): ColorRange[] {
	const tokens: SourceToken[] = [];
	for (let index = 0; index < source.length;) {
		const character = source[index] ?? "";
		if (/\s/.test(character)) {
			index += 1;
			continue;
		}
		if (source.startsWith("//", index)) {
			const newline = source.indexOf("\n", index);
			index = newline < 0 ? source.length : newline + 1;
			continue;
		}
		if (character === '"') {
			const end = source.indexOf('"', index + 1);
			if (end < 0 || source.slice(index + 1, end).includes("\n")) {
				const newline = source.indexOf("\n", index);
				index = newline < 0 ? source.length : newline + 1;
				continue;
			}
			tokens.push({
				type: "string",
				value: source.slice(index + 1, end),
				start: index + 1,
				end,
			});
			index = end + 1;
			continue;
		}
		const identifier = /^[a-zA-Z_]\w*/.exec(source.slice(index))?.[0];
		if (identifier !== undefined) {
			tokens.push({
				type: "identifier",
				value: identifier,
				start: index,
				end: index + identifier.length,
			});
			index += identifier.length;
			continue;
		}
		const punctuation = {
			"(": "left-paren",
			")": "right-paren",
			",": "comma",
		} as const;
		const type = punctuation[character as keyof typeof punctuation];
		if (type !== undefined) {
			tokens.push({ type, value: character, start: index, end: index + 1 });
		} else {
			tokens.push({
				type: "other",
				value: character,
				start: index,
				end: index + 1,
			});
		}
		index += 1;
	}

	const ranges: ColorRange[] = [];
	const calls: {
		colorArgument: boolean;
		argumentIndex: number;
		firstArgument: "empty" | "string" | "invalid";
		color?: ColorRange | undefined;
	}[] = [];
	let previous: SourceToken | undefined;

	for (const token of tokens) {
		const activeCall = calls[calls.length - 1];
		if (
			activeCall?.argumentIndex === 0 &&
			activeCall.firstArgument !== "invalid" &&
			token.type !== "comma" &&
			token.type !== "right-paren" &&
			(activeCall.firstArgument === "string" || token.type === "identifier")
		) {
			activeCall.color = undefined;
			activeCall.firstArgument = "invalid";
		}
		if (token.type === "left-paren") {
			const parent = calls[calls.length - 1];
			if (parent?.argumentIndex === 0 && parent.firstArgument === "empty") {
				parent.firstArgument = "invalid";
			}
			calls.push({
				colorArgument:
					previous?.type === "identifier" &&
					COLOR_FUNCTIONS.has(previous.value),
				argumentIndex: 0,
				firstArgument: "empty",
			});
		} else if (token.type === "right-paren") {
			const call = calls[calls.length - 1];
			if (call?.color !== undefined) ranges.push(call.color);
			calls.pop();
		} else if (token.type === "comma" && calls.length > 0) {
			const call = calls[calls.length - 1];
			if (call) {
				call.color = undefined;
				call.firstArgument = "invalid";
				call.argumentIndex += 1;
			}
		} else if (token.type === "string") {
			const call = calls[calls.length - 1];
			if (
				call?.colorArgument &&
				call.argumentIndex === 0 &&
				call.firstArgument === "empty" &&
				(colornames.has(token.value.toLowerCase()) ||
					/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(
						token.value,
					))
			) {
				call.color = {
					color: token.value,
					start: token.start,
					end: token.end,
				};
				call.firstArgument = "string";
			} else if (call?.argumentIndex === 0 && call.firstArgument === "empty") {
				call.firstArgument = "invalid";
			}
		} else if (token.type === "other") {
			const call = calls[calls.length - 1];
			if (call?.argumentIndex === 0) {
				call.color = undefined;
				call.firstArgument = "invalid";
			}
		}
		previous = token;
	}
	return ranges;
}
