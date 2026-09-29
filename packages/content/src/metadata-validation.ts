// ABOUTME: Provides host-neutral validation for shared sketch metadata fields.
// ABOUTME: Leaves authoring policy to the user-description and bundled-content boundaries.

export function isNonEmptyTitle(value: unknown): value is string {
	return typeof value === "string" && value.trim() !== "";
}

export function isFiniteOrder(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

export function isBooleanField(value: unknown): value is boolean {
	return typeof value === "boolean";
}

export function isStringList(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((entry) => typeof entry === "string")
	);
}
