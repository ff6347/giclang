// ABOUTME: Exercises AI-specific pilot answers through the real feedback HTTP server.
// ABOUTME: Keeps checkbox groups independently nullable and verifies private CSV values.

import assert from "node:assert/strict";
import test from "node:test";
import { config, fixture } from "./fixture.ts";

test("stores AI-use purposes independently from sources of help", async (t) => {
	const { app, store, login } = await fixture(t);
	const headers = await login();
	const submissions = [
		{ consent: "1", c1_human: "1" },
		{ consent: "1", c5_generate: "1" },
		{ consent: "1" },
		{
			consent: "1",
			c1_tutor: "1",
			c5_hint: "1",
			c5_understand: "1",
			c6_ai_speed: "0",
			c4_ai_situation: "I changed the loop myself.",
		},
	];
	for (const values of submissions) {
		const response = await app.request("/submit", {
			method: "POST",
			headers,
			body: new URLSearchParams(values),
		});
		assert.equal(response.status, 303);
	}
	const rows = store.rows("responses");
	assert.deepEqual(
		rows.map((row) => ({
			help: row.c1_human,
			tutor: row.c1_tutor,
			generate: row.c5_generate,
			hint: row.c5_hint,
			understand: row.c5_understand,
			speed: row.c6_ai_speed,
		})),
		[
			{
				help: 1,
				tutor: 0,
				generate: null,
				hint: null,
				understand: null,
				speed: null,
			},
			{
				help: null,
				tutor: null,
				generate: 1,
				hint: 0,
				understand: 0,
				speed: null,
			},
			{
				help: null,
				tutor: null,
				generate: null,
				hint: null,
				understand: null,
				speed: null,
			},
			{ help: 0, tutor: 1, generate: 0, hint: 1, understand: 1, speed: 0 },
		],
	);
	assert.equal(rows[3]!.c4_ai_situation, "I changed the loop myself.");
	const response = await app.request("/admin/export?table=responses", {
		headers: { authorization: `Bearer ${config.adminSecret}` },
	});
	assert.equal(response.status, 200);
	const csv = await response.text();
	assert.ok(csv.startsWith('"id","submitted_on","form_version","consent"'));
	assert.ok(csv.includes('"c5_generate"'));
	assert.ok(csv.includes('"c6_ai_speed"'));
	assert.ok(csv.includes('"I changed the loop myself."'));
});
