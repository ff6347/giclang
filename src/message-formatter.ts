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

	const caret = " ".repeat(column) + "^".repeat(Math.max(1, end - start));
	return `Error at line ${line + 1}, column ${column + 1}:\n${indent}${sourceLine}\n${indent}${caret}\n${indent}${message}`;
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
