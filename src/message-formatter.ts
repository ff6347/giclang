import type { GicError, ParserError } from "./error.ts";

export function error(e: GicError | ParserError, source: string): string {
	return report({
		line: e.line,
		start: e.start,
		end: e.end,
		message: e.message,
		source,
	});
}

export function report({
	line,
	start,
	message,
	source,
}: {
	line: number;
	start: number;
	end: number;
	message: string;
	source: string;
}): string {
	const column = calcColumn({ offset: start, source });

	return `Error at line ${line + 1}, column ${column + 1}: ${message}`;
}

export function calcColumn({
	offset,
	source,
}: {
	source: string;
	offset: number;
}) {
	let line = 0;
	let lineStart = 0;
	for (let i = 0; i < offset; i++) {
		if (source[i] === "\n") {
			line++;
			lineStart = i + 1; // first char after the newline
		}
	}
	const column = offset - lineStart;
	return column;
}
