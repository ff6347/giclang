// ABOUTME: Converts desktop operation failures into safe user-visible text.
// ABOUTME: Keeps native recovery details readable without rendering markup.

export function desktopOperationMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return error.message;
	}
	if (typeof error === "string" && error.trim() !== "") {
		return error;
	}
	return "GIC could not complete the desktop file operation.";
}
