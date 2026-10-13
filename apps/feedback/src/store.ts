// ABOUTME: Persists anonymous questionnaire responses and wishes in SQLite.
// ABOUTME: Uses WAL and a single transaction for each submitted response.

import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { stringify } from "csv-stringify/sync";
import { questions } from "./questions.ts";
import type { Submission } from "./validation.ts";

export type Table = "responses" | "wishes";
export const responseColumns = [
	"id",
	"submitted_on",
	"form_version",
	"consent",
	...questions.map((q) => q.id),
];
export const wishColumns = ["id", "response_id", "position", "want", "so_that"];

function questionColumnType(kind: (typeof questions)[number]["kind"]) {
	return kind === "rating" || kind === "checkbox" ? "INTEGER" : "TEXT";
}

export function openStore(path: string) {
	const db = new DatabaseSync(path);
	db.exec(
		"PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;",
	);
	db.exec("BEGIN IMMEDIATE");
	try {
		db.exec(`
			CREATE TABLE IF NOT EXISTS responses (
				id TEXT PRIMARY KEY,
				submitted_on TEXT NOT NULL,
				form_version TEXT NOT NULL,
				consent INTEGER NOT NULL CHECK(consent=1),
				${questions.map((q) => `${q.id} ${questionColumnType(q.kind)}`).join(",")}
			);
			CREATE TABLE IF NOT EXISTS wishes (
				id TEXT PRIMARY KEY,
				response_id TEXT NOT NULL REFERENCES responses(id),
				position INTEGER NOT NULL,
				want TEXT NOT NULL,
				so_that TEXT
			);
		`);
		const responseFields = new Set(
			db
				.prepare("PRAGMA table_info(responses)")
				.all()
				.map((column) => String(column.name)),
		);
		for (const question of questions)
			if (!responseFields.has(question.id))
				db.exec(
					`ALTER TABLE responses ADD COLUMN ${question.id} ${questionColumnType(question.kind)}`,
				);
		db.exec("COMMIT");
	} catch (error) {
		db.exec("ROLLBACK");
		db.close();
		throw error;
	}
	const insertResponse = db.prepare(
		`INSERT INTO responses (${responseColumns.join(",")}) VALUES (${responseColumns.map(() => "?").join(",")})`,
	);
	const insertWish = db.prepare(
		"INSERT INTO wishes (id,response_id,position,want,so_that) VALUES (?,?,?,?,?)",
	);
	return {
		save({ answers, wishes }: Submission) {
			const id = randomUUID();
			db.exec("BEGIN");
			try {
				insertResponse.run(
					id,
					new Date().toISOString().slice(0, 10),
					"v2",
					1,
					...questions.map((q) => answers[q.id] ?? null),
				);
				wishes.forEach((wish, index) =>
					insertWish.run(randomUUID(), id, index + 1, wish.want, wish.so_that),
				);
				db.exec("COMMIT");
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},
		rows(table: Table) {
			return db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all();
		},
		close() {
			db.close();
		},
	};
}

export type Store = ReturnType<typeof openStore>;

export function exportCsv(store: Store, table: Table): string {
	const columns = table === "responses" ? responseColumns : wishColumns;
	return stringify(store.rows(table), {
		columns,
		header: true,
		quoted: true,
		quoted_empty: true,
		record_delimiter: "windows",
		escape_formulas: true,
		cast: {
			// The questionnaire also protects formula prefixes after whitespace.
			string: (value) => (/^\s+[=+\-@]/u.test(value) ? `'${value}` : value),
		},
	});
}
