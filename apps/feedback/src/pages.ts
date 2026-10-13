// ABOUTME: Renders the password gate and anonymous workshop feedback pages.
// ABOUTME: Escapes all dynamic strings before they are included in HTML responses.

import { questions, type Question } from "./questions.ts";

const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const formatQuestionLabel = (value: string): string =>
	escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");

const page = (
	title: string,
	body: string,
	script = false,
): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/assets/feedback.css">
${script ? '<script src="/assets/form.js" defer></script>' : ""}
</head>
<body>
<main>${body}</main>
</body>
</html>`;

const checked = (values: URLSearchParams, id: string, value: string): string =>
	values.getAll(id).includes(value) ? " checked" : "";

const question = (id: string): Question => {
	const item = questions.find((candidate) => candidate.id === id);
	if (!item) throw new Error(`Unknown question: ${id}`);
	return item;
};

const choice = (item: Question, values: URLSearchParams): string => `
<fieldset>
<legend>${formatQuestionLabel(item.label)}</legend>
${item.options
	.map(
		(option) =>
			`<label><input type="radio" name="${item.id}" value="${option.value}"${checked(
				values,
				item.id,
				option.value,
			)}> ${option.label}</label>`,
	)
	.join("\n")}
</fieldset>`;

const text = (item: Question, values: URLSearchParams): string => `
<label class="text-answer" for="${item.id}">${formatQuestionLabel(item.label)}
<textarea id="${item.id}" name="${item.id}" maxlength="2000">${escapeHtml(values.get(item.id) ?? "")}</textarea>
</label>`;

const ratingTable = (ids: string[], values: URLSearchParams): string => {
	const items = ids.map(question);
	const options = items[0]?.options ?? [];
	return `<div class="rating-table-wrap"><table>
<thead><tr><th scope="col">Statement</th>${options
		.map(
			(option) =>
				`<th scope="col"${option.value === "0" ? ' class="opt-out"' : ""}>${option.label}</th>`,
		)
		.join("")}</tr></thead>
<tbody>${items
		.map(
			(item) =>
				`<tr><th scope="row">${formatQuestionLabel(item.label)}</th>${item.options
					.map(
						(option) =>
							`<td${option.value === "0" ? ' class="opt-out"' : ""}><input type="radio" aria-label="${item.label}: ${option.label}" name="${item.id}" value="${option.value}"${checked(values, item.id, option.value)}></td>`,
					)
					.join("")}</tr>`,
		)
		.join("")}</tbody>
</table></div>`;
};

const wishRow = (want = "", soThat = ""): string => `
<fieldset class="wish-row">
<legend>Wish</legend>
<label>As a user I want to be able to <input name="want" maxlength="500" value="${escapeHtml(want)}"></label>
<label>so that <input name="so_that" maxlength="500" value="${escapeHtml(soThat)}"></label>
</fieldset>`;

export const loginPage = (error?: string): string =>
	page(
		"GIC Workshop Feedback",
		`<h1>GIC Workshop Feedback</h1>
<form method="post" action="/login">
<label for="password">Participant password</label>
<input id="password" name="password" type="password" required autofocus>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
<button type="submit">Continue</button>
</form>`,
	);

export const formPage = (
	values = new URLSearchParams(),
	errors: string[] = [],
): string => {
	const wishWants = values.getAll("want");
	const wishSoThat = values.getAll("so_that");
	const wishRows = Array.from({ length: 20 }, (_, index) =>
		wishRow(wishWants[index] ?? "", wishSoThat[index] ?? ""),
	).join("");

	return page(
		"GIC Workshop Feedback",
		`<h1>GIC Workshop Feedback</h1>
<p>This form is part of Fabian Morón Zirfas's master's thesis (Speculative Software, FH Potsdam). It asks how you experienced learning programming with GIC, with and without AI. There are no right or wrong answers. Critical feedback is especially useful.</p>
<ul>
<li>It takes about 10 minutes. Every question is optional, so skip anything that doesn't apply.</li>
<li>The form is anonymous. No names, email addresses or IP addresses are collected. Please don't mention names or other identifying details in your written answers.</li>
<li>Your answers will be used for the thesis, for future workshops and in publications. Short anonymous quotes may be used. The raw data will not be published, and Fabian will keep it indefinitely.</li>
<li>Because responses are anonymous, a single response can't be found or deleted after you submit it.</li>
<li>You may answer the written questions in German or English.</li>
</ul>
${errors.length ? `<div class="error" role="alert"><ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>` : ""}
<form method="post" action="/submit">
<div class="honeypot" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></div>
<fieldset><legend>Consent</legend><label><input type="checkbox" name="consent" value="1" required${checked(values, "consent", "1")}> I agree that my anonymous answers may be used and quoted as described above. (required)</label></fieldset>
<section><h2>Section A: About you</h2>${["a1_experience", "a2_vibecoding", "a3_ai_attitude"].map((id) => choice(question(id), values)).join("")}</section>
<section><h2>Section B: Concepts and GIC without AI</h2>
<h3>B1. Grid (classic table)</h3><p>Now, at the end of the workshop, how confident are you that you could use each of these in your own sketch without help?</p>
${ratingTable(["b1_variables", "b1_drawing", "b1_coordinates", "b1_arithmetic", "b1_conditionals", "b1_repeat", "b1_functions", "b1_random", "b1_debugging"], values)}
<h3>B2.</h3><p>Think about the part of the workshop before AI was introduced.</p>
${ratingTable(["b2_focus", "b2_limits_blocked", "b2_code_image", "b2_errors"], values)}
${text(question("b3_simplicity_moment"), values)}</section>
<section><h2>Section C: Working with AI</h2><p>Didn't use any help? Skip to Section D.</p>
<fieldset><legend>Which kinds of help did you use at all?</legend>${[
			"c1_tutor",
			"c1_chat",
			"c1_agent",
			"c1_human",
			"c1_none",
		]
			.map((id) => {
				const item = question(id);
				return `<label><input type="checkbox" name="${item.id}" value="1"${checked(values, item.id, "1")}> ${item.label}</label>`;
			})
			.join("")}</fieldset>
${choice(question("c2_main_help"), values)}
<h3>C3.</h3><p>The following statements are about the help you chose in C2.</p>
${ratingTable(["c3_understand_why", "c3_own_thinking", "c3_accepted_unclear", "c3_explain_code", "c3_learned_more"], values)}
${text(question("c4_ai_situation"), values)}</section>
<section><h2>Section D: Workshop and tool</h2>${choice(question("d1_pace"), values)}
${ratingTable(["d2_explanations", "d2_practice_time", "d2_editor", "d2_docs"], values)}
${choice(question("d3_continue"), values)}${text(question("d4_keep"), values)}${text(question("d5_change"), values)}</section>
<section><h2>Section E: Your wishes (optional)</h2>
<p>What would you like to be able to do in GIC, in the workshop or with the AI help? Add as many as you like.</p>
<div id="wishes">${wishRows}</div>
<template id="wish-template">${wishRow()}</template>
<button id="add-wish" type="button">+ Add another</button></section>
<button type="submit">Submit feedback</button>
</form>`,
		true,
	);
};

export const thanksPage = (): string =>
	page(
		"Thank you",
		"<h1>Thank you</h1><p>Your anonymous feedback has been submitted.</p>",
	);

export const closedPage = (): string =>
	page(
		"GIC Workshop Feedback",
		"<h1>GIC Workshop Feedback</h1><p>This feedback form is closed.</p>",
	);
