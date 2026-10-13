// ABOUTME: Validates feedback server environment settings before opening the database.
// ABOUTME: Keeps production fail-closed and supplies defaults only for explicit development mode.

import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export function loadConfig(
	env: NodeJS.ProcessEnv = process.env,
	development = false,
) {
	if (development) {
		env = {
			HOST: "127.0.0.1",
			FORM_OPEN: "true",
			DB_PATH: fileURLToPath(
				new URL("../data/development.sqlite", import.meta.url),
			),
			PARTICIPANT_PASSWORD: "feedback",
			ADMIN_SECRET: randomBytes(32).toString("hex"),
			COOKIE_SECRET: randomBytes(32).toString("hex"),
			...env,
		};
	}
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
