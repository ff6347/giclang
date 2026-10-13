// ABOUTME: Exercises feedback HTTP routes against real temporary SQLite databases.
// ABOUTME: Covers the password gate, submissions, privacy, validation, and exports.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../app.ts";
import { openStore } from "../store.ts";
import { config, fixture } from "./fixture.ts";

test("password gate protects form and exports with separate credentials", async (t) => {
	const { app } = await fixture(t);
	assert.equal((await app.request("/form")).status, 303);
	assert.equal((await app.request("/submit", { method: "POST" })).status, 303);
	const wrong = await app.request("/login", {
		method: "POST",
		body: new URLSearchParams({ password: "wrong" }),
	});
	assert.equal(wrong.status, 401);
	const login = await app.request("/login", {
		method: "POST",
		body: new URLSearchParams({ password: config.participantPassword }),
	});
	assert.equal(login.status, 303);
	const cookie = login.headers.get("set-cookie")!;
	for (const attribute of [
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
		"Max-Age=43200",
	]) {
		assert.ok(cookie.includes(attribute), attribute);
	}
	assert.equal(
		(await app.request("/form", { headers: { cookie } })).status,
		200,
	);
	assert.equal(
		(
			await app.request("/form", {
				headers: { cookie: `${cookie.split("=")[0]}=tampered` },
			})
		).status,
		303,
	);
	assert.equal(
		(
			await app.request("/admin/export?table=responses", {
				headers: { cookie },
			})
		).status,
		401,
	);
	assert.equal(
		(
			await app.request("/login", {
				method: "POST",
				headers: { origin: "https://other.example" },
				body: new URLSearchParams({ password: config.participantPassword }),
			})
		).status,
		403,
	);
});

test("stores full and consent-only submissions, date-only metadata, and survives reopening", async (t) => {
	const { app, store, path } = await fixture(t);
	const login = await app.request("/login", {
		method: "POST",
		body: new URLSearchParams({ password: config.participantPassword }),
	});
	const headers = {
		cookie: login.headers.get("set-cookie")!,
		"user-agent": "must-not-be-stored",
		"x-forwarded-for": "192.0.2.1",
	};
	const body = new URLSearchParams({
		consent: "1",
		a1_experience: "little",
		b1_variables: "0",
		b2_limits_blocked: "4",
		c1_tutor: "1",
		c3_accepted_unclear: "3",
		d4_keep: ' \t=SUM(1,2)\n"hello"',
		want: "More practice",
		so_that: "",
	});
	const saved = await app.request("/submit", { method: "POST", headers, body });
	assert.equal(saved.status, 303);
	assert.equal(saved.headers.get("location"), "/thanks");
	assert.equal(
		(
			await app.request("/submit", {
				method: "POST",
				headers,
				body: new URLSearchParams({ consent: "1" }),
			})
		).status,
		303,
	);
	const rows = store.rows("responses");
	assert.equal(rows.length, 2);
	assert.equal(rows[0]!.b1_variables, 0);
	assert.equal(rows[0]!.b2_limits_blocked, 4);
	assert.equal(rows[0]!.c1_tutor, 1);
	assert.equal(rows[0]!.c1_none, 0);
	assert.equal(rows[1]!.a1_experience, null);
	assert.equal(rows[1]!.c1_tutor, null);
	assert.match(String(rows[0]!.submitted_on), /^\d{4}-\d{2}-\d{2}$/);
	assert.doesNotMatch(JSON.stringify(rows), /must-not-be-stored|192\.0\.2\.1/);
	assert.equal(store.rows("wishes")[0]!.so_that, null);
	const reopened = openStore(path);
	assert.equal(reopened.rows("responses").length, 2);
	reopened.close();
	const exported = await app.request("/admin/export?table=responses", {
		headers: { authorization: `Bearer ${config.adminSecret}` },
	});
	assert.equal(exported.status, 200);
	assert.equal(exported.headers.get("cache-control"), "no-store");
	assert.ok((await exported.text()).includes('"\' \t=SUM(1,2)\n""hello"""'));
});

test("rejects invalid input, retains escaped answers, and discards honeypots", async (t) => {
	const { app, store } = await fixture(t);
	const login = await app.request("/login", {
		method: "POST",
		body: new URLSearchParams({ password: config.participantPassword }),
	});
	const headers = { cookie: login.headers.get("set-cookie")! };
	for (const invalid of [
		new URLSearchParams({ d4_keep: "<script>alert(1)</script>" }),
		new URLSearchParams({ consent: "1", a1_experience: "invalid" }),
		new URLSearchParams({ consent: "1", unknown: "value" }),
		new URLSearchParams("consent=1&consent=1"),
		new URLSearchParams({ consent: "1", d4_keep: "x".repeat(2001) }),
		new URLSearchParams({ consent: "1", want: "x".repeat(501), so_that: "" }),
		new URLSearchParams(`consent=1&${"want=x&so_that=&".repeat(21)}`),
	]) {
		const result = await app.request("/submit", {
			method: "POST",
			headers,
			body: invalid,
		});
		assert.equal(result.status, 422);
		if (invalid.get("d4_keep")?.startsWith("<script>")) {
			const html = await result.text();
			assert.ok(html.includes("&lt;script&gt;"));
			assert.ok(!html.includes("<script>alert"));
		}
	}
	assert.equal(
		(
			await app.request("/submit", {
				method: "POST",
				headers,
				body: new URLSearchParams({ consent: "1", website: "spam" }),
			})
		).status,
		303,
	);
	assert.equal(store.rows("responses").length, 0);
	assert.equal(
		(
			await app.request("/submit", {
				method: "POST",
				headers,
				body: new URLSearchParams({ consent: "1", d4_keep: "x".repeat(65536) }),
			})
		).status,
		413,
	);
	const closed = createApp({ ...config, formOpen: false }, store);
	const closedHeaders = { ...headers, origin: "http://localhost" };
	assert.match(
		await (await closed.request("/form", { headers })).text(),
		/This feedback form is closed/,
	);
	assert.equal(
		(
			await closed.request("/submit", {
				method: "POST",
				headers: closedHeaders,
				body: new URLSearchParams({ consent: "1" }),
			})
		).status,
		403,
	);
	assert.equal(store.rows("responses").length, 0);
});
