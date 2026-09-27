// ABOUTME: Provides student-facing messages for native model-discovery failures.
// ABOUTME: Keeps provider and credential details out of the desktop settings UI.

export function modelDiscoveryError(error: unknown): string {
	if (typeof error === "string") {
		if (error.startsWith("OpenRouter ")) {
			return error;
		}
		if (error.startsWith("OpenCode Go ")) {
			const status = /HTTP ([45]\d{2})/.exec(error)?.[1];
			switch (status) {
				case "401":
					return "OpenCode Go rejected the saved key (HTTP 401). Sign out and reconnect with a valid Go API key.";
				case "402":
					return "OpenCode Go requires an active subscription or available balance (HTTP 402). Check your Go console.";
				case "403":
					return "OpenCode Go denied model access (HTTP 403). Check your Go subscription and model access.";
				case "404":
					return "OpenCode Go model unavailable (HTTP 404). Refresh models and choose another.";
				case "429":
					return "OpenCode Go usage limit reached (HTTP 429). Check the Go console or retry after the limit resets.";
			}
			if (error.startsWith("OpenCode Go returned an invalid model list.")) {
				return "OpenCode Go returned an invalid model list. Retry models.";
			}
			return "OpenCode Go models could not be loaded. Check your connection and retry.";
		}
		const status = /^OpenCode request failed \(HTTP ([45]\d{2})\):/.exec(
			error,
		)?.[1];
		if (status === "401") {
			return "OpenCode Zen rejected the saved key (HTTP 401). Sign out and reconnect with a valid Zen API key.";
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
