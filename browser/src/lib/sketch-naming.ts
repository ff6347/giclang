// ABOUTME: Generates Processing-style names for new sketches.
// ABOUTME: Keeps the date-based, collision-avoiding name rule pure and testable.

function padded(value: number, width: number): string {
	return String(value).padStart(width, "0");
}

function letterSuffix(index: number): string {
	let value = index;
	let suffix = "";
	do {
		suffix = String.fromCharCode(97 + (value % 26)) + suffix;
		value = Math.floor(value / 26) - 1;
	} while (value >= 0);
	return suffix;
}

export function nextSketchName(
	takenNames: ReadonlySet<string>,
	now: Date,
): string {
	const date = `${padded(now.getFullYear(), 4)}${padded(now.getMonth() + 1, 2)}${padded(now.getDate(), 2)}`;
	for (let index = 0; ; index += 1) {
		const name = `sketch_${date}${letterSuffix(index)}`;
		if (!takenNames.has(name)) {
			return name;
		}
	}
}
