// ABOUTME: Exercises authentication expiry, proxy origins, and private exports over HTTP.
// ABOUTME: Checks transactional persistence and bounded submissions with real SQLite failures.

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { questions } from "../questions.ts";
import { config, fixture } from "./fixture.ts";

test("requires same-origin POSTs, including the HTTPS reverse-proxy origin", async (t) => {
	const { app, url, login, store } = await fixture(t);
	const cookie = await login();
	for (const route of ["/login", "/submit"]) {
		const body = new URLSearchParams({
			password: config.participantPassword,
			consent: "1",
		});
		for (const headers of [
			{ origin: "" },
			{ origin: "null" },
			{ origin: "https://other.example" },
			{ origin: url, "sec-fetch-site": "same-site" },
			{ origin: url, "x-forwarded-proto": "https" },
		]) {
			assert.equal(
				(
					await app.request(route, {
						method: "POST",
						headers: { ...cookie, ...headers },
						body,
					})
				).status,
				403,
			);
		}
		assert.equal(
			(
				await fetch(`${url}${route}`, {
					method: "POST",
					headers: cookie,
					body,
					redirect: "manual",
				})
			).status,
			403,
		);
	}
	const secureOrigin = url.replace("http:", "https:");
	const accepted = await app.request("/submit", {
		method: "POST",
		headers: {
			...cookie,
			origin: secureOrigin,
			"x-forwarded-proto": "https",
			"sec-fetch-site": "same-origin",
		},
		body: new URLSearchParams({ consent: "1" }),
	});
	assert.equal(accepted.status, 303);
	assert.equal(store.rows("responses").length, 1);
});

test("rejects expired signed cookies and participant bearer credentials", async (t) => {
	const { app } = await fixture(t);
	const expired = String(Date.now() - 1);
	const signature = createHmac("sha256", config.cookieSecret)
		.update(expired)
		.digest("base64");
	const cookie = `__Host-feedback=${encodeURIComponent(`${expired}.${signature}`)}`;
	for (const route of ["/form", "/submit"]) {
		const response = await app.request(route, {
			headers: { cookie },
			...(route === "/submit" ? { method: "POST" } : {}),
		});
		assert.equal(response.status, 303);
		assert.equal(response.headers.get("location"), "/");
	}
	for (const secret of ["incorrect", config.participantPassword]) {
		assert.equal(
			(
				await app.request("/admin/export?table=responses", {
					headers: { authorization: `Bearer ${secret}` },
				})
			).status,
			401,
		);
	}
	assert.equal(
		(
			await app.request("/admin/export?table=unknown", {
				headers: { authorization: `Bearer ${config.adminSecret}` },
			})
		).status,
		400,
	);
});

test("accepts every coded option, rejects every invalid code and duplicate scalar", async (t) => {
	const { app, login, store } = await fixture(t);
	const headers = await login();
	const coded = questions.filter((q) => q.kind !== "text");
	for (let index = 0; index < 5; index++) {
		const body = new URLSearchParams({ consent: "1" });
		for (const item of coded)
			body.set(item.id, item.options[index % item.options.length]!.value);
		for (const item of questions.filter((q) => q.kind === "text"))
			body.set(item.id, "German: Grüße. English: practice.");
		assert.equal(
			(await app.request("/submit", { method: "POST", headers, body })).status,
			303,
		);
		const row = store.rows("responses")[index]!;
		for (const item of coded)
			assert.equal(String(row[item.id]), body.get(item.id), item.id);
	}
	for (const item of coded) {
		const body = new URLSearchParams({ consent: "1", [item.id]: "invalid" });
		assert.equal(
			(await app.request("/submit", { method: "POST", headers, body })).status,
			422,
			item.id,
		);
	}
	for (const id of ["consent", "website", ...questions.map((q) => q.id)]) {
		const body = new URLSearchParams({ consent: "1" });
		if (id !== "consent") body.set(id, "");
		body.append(id, "");
		assert.equal(
			(await app.request("/submit", { method: "POST", headers, body })).status,
			422,
			id,
		);
	}
	assert.equal(store.rows("responses").length, 5);
});

test("preserves one-sided wishes, ignores empty entries, and exports safe CSV from both tables", async (t) => {
	const { app, login, store } = await fixture(t);
	const headers = await login();
	const body = new URLSearchParams({
		consent: "1",
		d4_keep: ' \t=SUM(1,2)\n"Grüße"',
	});
	for (const [want, reason] of [
		["", ""],
		["Only a wish", ""],
		["", "Only a reason"],
		["+plus", "-minus"],
		["\t@at", " =equals"],
	]) {
		body.append("want", want!);
		body.append("so_that", reason!);
	}
	assert.equal(
		(await app.request("/submit", { method: "POST", headers, body })).status,
		303,
	);
	assert.deepEqual(
		store
			.rows("wishes")
			.map(({ position, want, so_that }) => ({ position, want, so_that })),
		[
			{ position: 1, want: "Only a wish", so_that: null },
			{ position: 2, want: "", so_that: "Only a reason" },
			{ position: 3, want: "+plus", so_that: "-minus" },
			{ position: 4, want: "\t@at", so_that: " =equals" },
		],
	);
	for (const table of ["responses", "wishes"]) {
		const response = await app.request(`/admin/export?table=${table}`, {
			headers: { authorization: `Bearer ${config.adminSecret}` },
		});
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("cache-control"), "no-store");
		assert.equal(
			response.headers.get("content-type"),
			"text/csv; charset=utf-8",
		);
		assert.equal(
			response.headers.get("content-disposition"),
			`attachment; filename="${table}.csv"`,
		);
		const csv = await response.text();
		for (const value of table === "responses"
			? ['"\' \t=SUM(1,2)\n""Grüße"""']
			: ['"\'+plus"', '"\'-minus"', '"\'\t@at"', '"\' =equals"'])
			assert.ok(csv.includes(value), value);
		assert.ok(csv.endsWith("\r\n"));
	}
});

test("rolls back response and earlier wishes when a later SQLite insertion fails", async (t) => {
	const { app, path, login, store } = await fixture(t);
	const db = new DatabaseSync(path);
	try {
		assert.equal(db.prepare("PRAGMA journal_mode").get()!.journal_mode, "wal");
		db.exec(
			"CREATE TRIGGER reject_second BEFORE INSERT ON wishes WHEN NEW.position=2 BEGIN SELECT RAISE(ABORT, 'private failure'); END;",
		);
		const response = await app.request("/submit", {
			method: "POST",
			headers: await login(),
			body: new URLSearchParams(
				"consent=1&want=first&so_that=&want=second&so_that=",
			),
		});
		assert.equal(response.status, 500);
		assert.equal(await response.text(), "The request could not be completed.");
		assert.equal(response.headers.get("cache-control"), "no-store");
		assert.deepEqual(store.rows("responses"), []);
		assert.deepEqual(store.rows("wishes"), []);
	} finally {
		db.close();
	}
});

test("accepts limit boundaries and rejects mismatched wishes and unsupported bodies", async (t) => {
	const { app, login } = await fixture(t);
	const headers = await login();
	const body = new URLSearchParams({ consent: "1", d4_keep: "x".repeat(2000) });
	for (let index = 0; index < 20; index++) {
		body.append("want", "x".repeat(500));
		body.append("so_that", "y".repeat(500));
	}
	assert.equal(
		(await app.request("/submit", { method: "POST", headers, body })).status,
		303,
	);
	for (const invalid of [
		new URLSearchParams("consent=1&want=unpaired"),
		new URLSearchParams("consent=1&so_that=unpaired"),
		new URLSearchParams({ consent: "1", want: "", so_that: "x".repeat(501) }),
	])
		assert.equal(
			(await app.request("/submit", { method: "POST", headers, body: invalid }))
				.status,
			422,
		);
	assert.equal(
		(
			await app.request("/submit", {
				method: "POST",
				headers: { ...headers, "content-type": "application/json" },
				body: "{}",
			})
		).status,
		415,
	);
	assert.equal(
		(await app.request("/login", { method: "POST", body: "x".repeat(65537) }))
			.status,
		413,
	);
});
