// ABOUTME: functions for formatting for the cli
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
		start: start,
		source,
	});
	const indent = "  ";
	const sourceLine = source.slice(lineStart, lineEnd);
	const precedingLine =
		line === 0
			? ""
			: source.slice(
					source.lastIndexOf("\n", lineStart - 2) + 1,
					lineStart - 1,
				);

	const caret = " ".repeat(column) + "^".repeat(Math.max(1, end - start));
	const precedingContext = line === 0 ? "" : `${indent}${precedingLine}\n`;
	return `Error at line ${line + 1}, column ${column + 1}:\n${precedingContext}${indent}${sourceLine}\n${indent}${caret}\n${indent}${message}`;
}

export function locate({ start, source }: { source: string; start: number }) {
	let line = 0;
	let lineStart = 0;

	for (let i = 0; i < start; i++) {
		if (source[i] === "\n") {
			line++;
			lineStart = i + 1; // first char after the newline
		}
	}
	const nextNewline = source.indexOf("\n", lineStart);
	const lineEnd = nextNewline === -1 ? source.length : nextNewline;
	const column = start - lineStart;
	return { line, column, lineStart, lineEnd };
}
