import type { GicError, ParserError } from "./error.ts";
import { EOF } from "./tokens.ts";

export function error(e: GicError | ParserError, source: string): string {
	if (e.token?.type && e.token.type === EOF) {
		return report({
			line: e.line,
			start: e.token.start,
			end: e.token.end,
			where: "at end",
			message: e.message,
			source,
		});
	} else {
		return report({
			line: e.line,
			start: e.token?.start ?? 0,
			end: e.token?.end ?? 0,
			where: `at '${e.token?.lexeme}'`,
			message: e.message,
			source,
		});
	}
}

export function report({
	line,
	start,
	where,
	message,
	source,
}: {
	line: number;
	start: number;
	end: number;
	where: string;
	message: string;
	source: string;
}): string {
	const column = calcColumn({ offset: start, source });

	return `Error ${where} line ${line + 1}, column ${column + 1}: ${message}`;
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
