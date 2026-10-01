// ABOUTME: Finds CSS color names and hex values within GIC string literals.
// ABOUTME: Returns source ranges suitable for Monaco color decorations.

import { colornames } from "@giclang/core/color-names";

export interface ColorRange {
	color: string;
	start: number;
	end: number;
}

export function colorRanges(source: string): ColorRange[] {
	const ranges: ColorRange[] = [];
	for (let index = 0; index < source.length;) {
		const character = source[index] ?? "";
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
			const value = source.slice(index + 1, end);
			for (const match of value.matchAll(/[#\w]+/g)) {
				const color = match[0];
				if (
					!colornames.has(color.toLowerCase()) &&
					!/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
				) {
					continue;
				}
				const start = index + 1 + match.index;
				ranges.push({ color, start, end: start + color.length });
			}
			index = end + 1;
			continue;
		}
		index += 1;
	}
	return ranges;
}
