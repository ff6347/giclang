// ABOUTME: Serves the anonymous feedback form with participant and admin access gates.
// ABOUTME: Validates bounded HTML submissions without logging request or response data.

import { createHash, timingSafeEqual } from "node:crypto";
import { Hono, type Context, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { serveAssets } from "./assets.ts";
import { closedPage, formPage, loginPage, thanksPage } from "./pages.ts";
import { exportCsv, type Store } from "./store.ts";
import { formFields, loginSchema, validate } from "./validation.ts";

export type Config = {
	participantPassword: string;
	adminSecret: string;
	cookieSecret: string;
	formOpen: boolean;
};

function matches(actual: string, expected: string) {
	const digest = (text: string) => createHash("sha256").update(text).digest();
	return timingSafeEqual(digest(actual), digest(expected));
}

export function createApp(config: Config, store: Store) {
	const app = new Hono();
	app.use("*", async (c, next) => {
		c.header("Cache-Control", "no-store");
		c.header(
			"Content-Security-Policy",
			"default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
		);
		c.header("X-Content-Type-Options", "nosniff");
		c.header("Referrer-Policy", "same-origin");
		await next();
	});
	app.use(
		"*",
		bodyLimit({
			maxSize: 64 * 1024,
			onError: (c) =>
				c.text("The form is too large. Please shorten your answers.", 413),
		}),
	);
	app.use("*", async (c, next) => {
		if (c.req.method === "POST") {
			const origin = c.req.header("origin");
			const site = c.req.header("sec-fetch-site");
			if (!origin || (site && site !== "same-origin"))
				return c.text("Please submit from this website.", 403);
			const target = new URL(c.req.url);
			// The HTTPS proxy must preserve Host and overwrite X-Forwarded-Proto.
			const protocol = c.req.header("x-forwarded-proto");
			if (protocol && protocol !== "http" && protocol !== "https")
				return c.text("Please submit from this website.", 403);
			if (protocol) target.protocol = `${protocol}:`;
			if (origin !== target.origin)
				return c.text("Please submit from this website.", 403);
			if (
				!c.req
					.header("content-type")
					?.startsWith("application/x-www-form-urlencoded")
			) {
				// Authentication runs first for the protected submission route.
				if (c.req.path !== "/submit")
					return c.text("Use the HTML form to submit.", 415);
			}
		}
		return next();
	});
	app.use("/form", participant);
	app.use("/submit", participant);
	async function participant(c: Context, next: Next) {
		const signed = await getSignedCookie(
			c,
			config.cookieSecret,
			"__Host-feedback",
		);
		const expires =
			typeof signed === "string" && /^\d+$/.test(signed) ? Number(signed) : 0;
		if (expires <= Date.now()) return c.redirect("/", 303);
		return next();
	}
	app.get("/", (c) => c.html(config.formOpen ? loginPage() : closedPage()));
	app.post("/login", async (c) => {
		if (!config.formOpen) return c.html(closedPage(), 403);
		const result = loginSchema.safeParse(
			formFields(new URLSearchParams(await c.req.text())),
		);
		if (
			!result.success ||
			!matches(result.data.password, config.participantPassword)
		) {
			return c.html(loginPage("The password is incorrect."), 401);
		}
		await setSignedCookie(
			c,
			"__Host-feedback",
			String(Date.now() + 12 * 60 * 60 * 1000),
			config.cookieSecret,
			{
				httpOnly: true,
				secure: true,
				sameSite: "Lax",
				path: "/",
				maxAge: 12 * 60 * 60,
			},
		);
		return c.redirect("/form", 303);
	});
	app.get("/form", (c) => c.html(config.formOpen ? formPage() : closedPage()));
	app.post("/submit", async (c) => {
		if (!config.formOpen) return c.html(closedPage(), 403);
		if (
			!c.req
				.header("content-type")
				?.startsWith("application/x-www-form-urlencoded")
		)
			return c.text("Use the HTML form to submit.", 415);
		const values = new URLSearchParams(await c.req.text());
		if (values.get("website")) return c.redirect("/thanks", 303);
		const result = validate(values);
		if ("errors" in result) return c.html(formPage(values, result.errors), 422);
		store.save(result.submission);
		return c.redirect("/thanks", 303);
	});
	app.get("/thanks", (c) => c.html(thanksPage()));
	app.get("/admin/export", (c) => {
		if (
			!matches(
				c.req.header("authorization") ?? "",
				`Bearer ${config.adminSecret}`,
			)
		) {
			c.header("WWW-Authenticate", "Bearer");
			return c.text("Admin authorization required.", 401);
		}
		const table = c.req.query("table");
		if (table !== "responses" && table !== "wishes")
			return c.text("Choose table=responses or table=wishes.", 400);
		c.header("Content-Type", "text/csv; charset=utf-8");
		c.header("Content-Disposition", `attachment; filename="${table}.csv"`);
		return c.body(exportCsv(store, table));
	});
	app.get("/health", (c) => c.text("ok"));
	app.onError(
		() =>
			new Response("The request could not be completed.", {
				status: 500,
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					"Cache-Control": "no-store",
				},
			}),
	);
	serveAssets(app);
	return app;
}
