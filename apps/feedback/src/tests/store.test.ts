// ABOUTME: Verifies additive SQLite migration from the frozen v1 feedback schema.
// ABOUTME: Preserves historical responses and wishes while saving v2 submissions.

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exportCsv, openStore, responseColumns } from "../store.ts";
import type { Submission } from "../validation.ts";

const v1QuestionColumns = `
	a1_experience TEXT,
	a2_vibecoding TEXT,
	a3_ai_attitude TEXT,
	b1_variables INTEGER,
	b1_drawing INTEGER,
	b1_coordinates INTEGER,
	b1_arithmetic INTEGER,
	b1_conditionals INTEGER,
	b1_repeat INTEGER,
	b1_functions INTEGER,
	b1_random INTEGER,
	b1_debugging INTEGER,
	b2_focus INTEGER,
	b2_limits_blocked INTEGER,
	b2_code_image INTEGER,
	b2_errors INTEGER,
	b3_simplicity_moment TEXT,
	c1_tutor INTEGER,
	c1_chat INTEGER,
	c1_agent INTEGER,
	c1_human INTEGER,
	c1_none INTEGER,
	c2_main_help TEXT,
	c3_understand_why INTEGER,
	c3_own_thinking INTEGER,
	c3_accepted_unclear INTEGER,
	c3_explain_code INTEGER,
	c3_learned_more INTEGER,
	c4_ai_situation TEXT,
	d1_pace TEXT,
	d2_explanations INTEGER,
	d2_practice_time INTEGER,
	d2_editor INTEGER,
	d2_docs INTEGER,
	d3_continue TEXT,
	d4_keep TEXT,
	d5_change TEXT
`;

const v2Columns = [
	"c5_hint",
	"c5_understand",
	"c5_debug",
	"c5_generate",
	"c5_modify",
	"c5_explore",
	"c5_other",
	"c6_ai_speed",
] as const;

const historicalResponse = {
	id: "response-v1",
	submitted_on: "2026-10-06",
	form_version: "v1",
	consent: 1,
	a1_experience: "little",
	b1_variables: 3,
	c1_tutor: 1,
	c3_understand_why: 4,
	c4_ai_situation: "The tutor helped me find a missing semicolon.",
	d4_keep: "The drawing exercises",
} as const;

function createV1Database(path: string) {
	const db = new DatabaseSync(path);
	try {
		db.exec(`
			CREATE TABLE responses (
				id TEXT PRIMARY KEY,
				submitted_on TEXT NOT NULL,
				form_version TEXT NOT NULL,
				consent INTEGER NOT NULL CHECK(consent=1),
				${v1QuestionColumns}
			);
			CREATE TABLE wishes (
				id TEXT PRIMARY KEY,
				response_id TEXT NOT NULL REFERENCES responses(id),
				position INTEGER NOT NULL,
				want TEXT NOT NULL,
				so_that TEXT
			);
		`);
		const columns = Object.keys(historicalResponse);
		db.prepare(
			`INSERT INTO responses (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
		).run(
			...columns.map(
				(column) =>
					historicalResponse[column as keyof typeof historicalResponse],
			),
		);
		db.prepare(
			"INSERT INTO wishes (id,response_id,position,want,so_that) VALUES (?,?,?,?,?)",
		).run(
			"wish-v1",
			historicalResponse.id,
			1,
			"More time to practise",
			"So that I can understand functions",
		);
	} finally {
		db.close();
	}
}

test("migrates a v1 database additively and saves v2 responses", async (t) => {
	const directory = await mkdtemp(join(tmpdir(), "gic-feedback-store-"));
	const path = join(directory, "feedback.sqlite");
	createV1Database(path);
	const store = openStore(path);
	let storeClosed = false;
	t.after(async () => {
		if (!storeClosed) store.close();
		await rm(directory, { force: true, recursive: true });
	});

	const [historical] = store.rows("responses");
	assert.deepEqual(
		Object.fromEntries(
			Object.keys(historicalResponse).map((column) => [
				column,
				historical![column],
			]),
		),
		historicalResponse,
	);
	for (const column of v2Columns)
		assert.equal(historical![column], null, column);
	const schema = new DatabaseSync(path);
	try {
		const types = Object.fromEntries(
			schema
				.prepare("PRAGMA table_info(responses)")
				.all()
				.map((column) => [String(column.name), String(column.type)]),
		);
		for (const column of v2Columns)
			assert.equal(types[column], "INTEGER", column);
	} finally {
		schema.close();
	}
	assert.deepEqual(
		store.rows("wishes").map((row) => ({ ...row })),
		[
			{
				id: "wish-v1",
				response_id: "response-v1",
				position: 1,
				want: "More time to practise",
				so_that: "So that I can understand functions",
			},
		],
	);

	const answers: Submission["answers"] = {
		c5_hint: 1,
		c5_understand: 0,
		c5_debug: 1,
		c5_generate: 0,
		c5_modify: 0,
		c5_explore: 1,
		c5_other: 0,
		c6_ai_speed: 4,
	};
	store.save({ answers, wishes: [] });

	const [, revised] = store.rows("responses");
	assert.equal(revised!.form_version, "v2");
	for (const [column, value] of Object.entries(answers))
		assert.equal(revised![column], value, column);
	assert.equal(
		exportCsv(store, "responses").split("\r\n")[0],
		responseColumns.map((column) => `"${column}"`).join(","),
	);

	store.close();
	storeClosed = true;
	const reopened = openStore(path);
	try {
		assert.equal(reopened.rows("responses").length, 2);
		assert.equal(reopened.rows("responses")[0]!.form_version, "v1");
	} finally {
		reopened.close();
	}
});
