// ABOUTME: Generates Processing-style names for new sketches.
// ABOUTME: Keeps the date-based, collision-avoiding name rule pure and testable.

function padded(value: number, width: number): string {
	return String(value).padStart(width, "0");
}

export function nextSketchName(
	takenNames: ReadonlySet<string>,
	now: Date,
): string {
	const date = `${padded(now.getFullYear(), 4)}${padded(now.getMonth() + 1, 2)}${padded(now.getDate(), 2)}`;
	for (let offset = 0; offset < 26; offset += 1) {
		const name = `sketch_${date}${String.fromCharCode(97 + offset)}`;
		if (!takenNames.has(name)) {
			return name;
		}
	}
	return `sketch_${date}${padded(now.getMilliseconds(), 3)}`;
}
