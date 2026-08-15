import type { GicError, ParserError } from "./error.ts";

export function error(e: GicError | ParserError, source: string): string {
	return report({
		offset: e.start,
		end: e.end,
		message: e.message,
		source,
	});
}

export function report({
	start,
	message,
	source,
	end,
}: {
	start: number;
	end: number;
	message: string;
	source: string;
}): string {
	const { column, line, lineStart, lineEnd } = locate({
		offset: start,
		source,
	});
	const indent = "  ";
	const sourceLine = source.slice(lineStart, lineEnd);

	const caret = " ".repeat(column) + "^".repeat(Math.max(1, end - start));
	return `Error at line ${line + 1}, column ${column + 1}:\n${indent}${sourceLine}\n${indent}${caret}\n${indent}${message}`;
}

export function locate({ offset, source }: { source: string; offset: number }) {
	let line = 0;
	let lineStart = 0;

	for (let i = 0; i < offset; i++) {
		if (source[i] === "\n") {
			line++;
			lineStart = i + 1; // first char after the newline
		}
	}
	const nextNewline = source.indexOf("\n", lineStart);
	const lineEnd = nextNewline === -1 ? source.length : nextNewline;
	const column = offset - lineStart;
	return { line, column, lineStart, lineEnd };
}
