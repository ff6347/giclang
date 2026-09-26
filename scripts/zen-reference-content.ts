// ABOUTME: Validates bounded calls and extracts relevant language-reference content.
// ABOUTME: Keeps model-provided queries from producing unbounded tool output.

function record(value: unknown): Record<string, unknown> | null {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

export function validCall(
	call: { id: string; name: string; arguments: string },
	name: string,
	expected: string,
): boolean {
	if (!call.id || call.name !== name) return false;
	try {
		const args = record(JSON.parse(call.arguments));
		if (args === null || Object.keys(args).length !== 1) return false;
		const value = args[expected];
		if (typeof value !== "string") return false;
		return name === "search_reference"
			? value.trim().length > 0 && value.length <= 200
			: name === "read_reference" && value.trim().toLowerCase() === "drawing";
	} catch {
		return false;
	}
}

export function sectionOf(reference: string, heading: string): string {
	const title = reference
		.split("\n")
		.find(
			(line) =>
				line.startsWith("## ") &&
				line.slice(3).trim().toLowerCase() === heading.trim().toLowerCase(),
		);
	if (!title) return "";
	const start = reference.indexOf(`${title}\n`);
	if (start < 0) return "";
	const from = start + `${title}\n`.length;
	const next = reference.indexOf("\n## ", from);
	return reference
		.slice(from, next < 0 ? undefined : next)
		.trim()
		.slice(0, 1800);
}

export function search(reference: string, query: string): string {
	const excluded = new Set([
		"function",
		"signature",
		"syntax",
		"arguments",
		"parameters",
		"the",
		"for",
		"how",
		"what",
		"does",
		"work",
		"with",
		"and",
	]);
	const term = (query.toLowerCase().match(/[a-z0-9_]+/g) ?? [])
		.filter((part) => part.length >= 3 && !excluded.has(part))
		.sort((a, b) => b.length - a.length)[0];
	if (!term) return "";
	const lines = reference.split("\n");
	const matches: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		if (!lines[i]!.toLowerCase().includes(term)) continue;
		matches.push(
			lines
				.slice(Math.max(0, i - 1), i + 2)
				.join("\n")
				.slice(0, 240),
		);
		if (matches.length === 3) break;
	}
	return matches.join("\n---\n").slice(0, 800);
}
