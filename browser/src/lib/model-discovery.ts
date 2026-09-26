// ABOUTME: Provides student-facing messages for native model-discovery failures.
// ABOUTME: Keeps provider and credential details out of the desktop settings UI.

export function modelDiscoveryError(error: unknown): string {
	if (typeof error === "string") {
		if (error.startsWith("OpenRouter ")) {
			return error;
		}
		const status = /^OpenCode request failed \(HTTP ([45]\d{2})\):/.exec(
			error,
		)?.[1];
		if (status === "401") {
			return "OpenCode rejected the saved key (HTTP 401). Sign out and reconnect with a valid Zen API key.";
		}
		if (status === "429") {
			return "OpenCode rate-limited model discovery (HTTP 429). Retry later.";
		}
		if (status !== undefined) {
			return `OpenCode model discovery failed (HTTP ${status}). Check account access or retry later.`;
		}
		if (error === "OpenCode returned an invalid model list.") {
			return "OpenCode returned an invalid model list. Retry models.";
		}
		if (error === "OpenCode is not authenticated.") {
			return "No OpenCode key is saved. Sign out and reconnect.";
		}
	}
	return "Tutor models could not be loaded. Check your network connection, then retry.";
}
