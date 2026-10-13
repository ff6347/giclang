// ABOUTME: Renders the password gate and anonymous workshop feedback pages.
// ABOUTME: Compiles trusted EJS templates with fixed filenames and escaped data.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ejs from "ejs";

import { questions, type Question } from "./questions.ts";

const render = (
	template: string,
	data: Record<string, unknown> = {},
): string => {
	const filename = fileURLToPath(
		new URL(`../views/${template}`, import.meta.url),
	);
	return ejs.compile(readFileSync(filename, "utf8"), { filename })(data);
};

const question = (id: string): Question => {
	const item = questions.find((candidate) => candidate.id === id);
	if (!item) throw new Error(`Unknown question: ${id}`);
	return item;
};

type LabelPart = {
	text: string;
	code: boolean;
};

const labelParts = (label: string): LabelPart[] =>
	label.split(/`([^`]+)`/).map((text, index) => ({
		text,
		code: index % 2 === 1,
	}));

const wishValues = (
	values: URLSearchParams,
): Array<{ want: string; soThat: string }> =>
	Array.from({ length: 20 }, (_, index) => ({
		want: values.getAll("want")[index] ?? "",
		soThat: values.getAll("so_that")[index] ?? "",
	}));

export const loginPage = (error?: string): string =>
	render("login.ejs", { error });

export const formPage = (
	values = new URLSearchParams(),
	errors: string[] = [],
): string =>
	render("form.ejs", {
		values,
		errors,
		question,
		labelParts,
		wishes: wishValues(values),
	});

export const thanksPage = (): string => render("thanks.ejs");

export const closedPage = (): string => render("closed.ejs");
