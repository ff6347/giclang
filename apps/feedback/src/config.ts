// ABOUTME: Validates feedback server environment settings before opening the database.
// ABOUTME: Requires separate access secrets and keeps submissions closed unless explicitly enabled.

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
	const required = (name: string) => {
		const value = env[name];
		if (!value?.trim()) throw new Error(`${name} is required.`);
		return value;
	};
	const participantPassword = required("PARTICIPANT_PASSWORD");
	const adminSecret = required("ADMIN_SECRET");
	const cookieSecret = required("COOKIE_SECRET");
	if (new Set([participantPassword, adminSecret, cookieSecret]).size !== 3)
		throw new Error("Access secrets must be different.");
	for (const [name, value] of [
		["ADMIN_SECRET", adminSecret],
		["COOKIE_SECRET", cookieSecret],
	] as const) {
		if (value.length < 32)
			throw new Error(`${name} must contain at least 32 characters.`);
	}
	const formOpen = env.FORM_OPEN ?? "false";
	if (formOpen !== "true" && formOpen !== "false")
		throw new Error("FORM_OPEN must be true or false.");
	const port = Number(env.PORT ?? 3000);
	if (!Number.isInteger(port) || port < 0 || port > 65535)
		throw new Error("PORT must be an integer between 0 and 65535.");
	return {
		participantPassword,
		adminSecret,
		cookieSecret,
		formOpen: formOpen === "true",
		dbPath: required("DB_PATH"),
		host: env.HOST ?? "0.0.0.0",
		port,
	};
}
