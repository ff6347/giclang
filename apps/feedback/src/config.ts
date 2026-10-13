// ABOUTME: Validates feedback server environment settings before opening the database.
// ABOUTME: Keeps production fail-closed and supplies defaults only for explicit development mode.

import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const required = z.string().refine((value) => value.trim().length > 0, {
	message: "A non-empty value is required.",
});
const environmentSchema = z
	.object({
		PARTICIPANT_PASSWORD: required,
		ADMIN_SECRET: required.min(32),
		COOKIE_SECRET: required.min(32),
		DB_PATH: required,
		FORM_OPEN: z.enum(["true", "false"]).default("false"),
		HOST: z.string().default("0.0.0.0"),
		PORT: z.coerce.number().int().min(0).max(65535).default(3000),
	})
	.refine(
		(values) =>
			new Set([
				values.PARTICIPANT_PASSWORD,
				values.ADMIN_SECRET,
				values.COOKIE_SECRET,
			]).size === 3,
		{ message: "Access secrets must be different." },
	);

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
	const values = environmentSchema.parse(env);
	return {
		participantPassword: values.PARTICIPANT_PASSWORD,
		adminSecret: values.ADMIN_SECRET,
		cookieSecret: values.COOKIE_SECRET,
		formOpen: values.FORM_OPEN === "true",
		dbPath: values.DB_PATH,
		host: values.HOST,
		port: values.PORT,
	};
}
