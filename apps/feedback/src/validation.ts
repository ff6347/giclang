// ABOUTME: Validates questionnaire submissions using the displayed question allowlists.
// ABOUTME: Keeps skipped answers distinct from explicit opt-outs and stores ordered wishes.

import { questions } from "./questions.ts";

export type Answers = Record<string, string | number | null>;
export type Wish = { want: string; so_that: string | null };
export type Submission = { answers: Answers; wishes: Wish[] };

export function validate(
	values: URLSearchParams,
): { errors: string[] } | { submission: Submission } {
	const errors: string[] = [];
	const known = new Set([
		"consent",
		"website",
		"want",
		"so_that",
		...questions.map((q) => q.id),
	]);
	for (const key of new Set(values.keys())) {
		if (!known.has(key)) errors.push("The form contains an unknown field.");
		if (key !== "want" && key !== "so_that" && values.getAll(key).length > 1) {
			errors.push("Please send each answer only once.");
		}
	}
	if (values.get("consent") !== "1")
		errors.push("Please agree to the consent statement before submitting.");
	const answers: Answers = {};
	const hasHelp = questions.some(
		(q) => q.kind === "checkbox" && values.get(q.id) === "1",
	);
	for (const question of questions) {
		const value = values.get(question.id);
		if (question.kind === "text") {
			if (value && value.length > 2000)
				errors.push(`${question.label} Please use at most 2,000 characters.`);
			answers[question.id] = value?.trim() ? value : null;
		} else if (value === null || value === "") {
			answers[question.id] = question.kind === "checkbox" && hasHelp ? 0 : null;
		} else if (!question.options.some((option) => option.value === value)) {
			errors.push(`Please choose a listed answer for: ${question.label}`);
		} else {
			answers[question.id] =
				question.kind === "rating" || question.kind === "checkbox"
					? Number(value)
					: value;
		}
	}
	const wants = values.getAll("want");
	const reasons = values.getAll("so_that");
	if (wants.length !== reasons.length)
		errors.push("Each wish must have both input fields.");
	if (Math.max(wants.length, reasons.length) > 20)
		errors.push("Please enter at most 20 wishes.");
	const wishes: Wish[] = [];
	for (let index = 0; index < Math.min(wants.length, 20); index++) {
		const want = wants[index]!;
		const reason = reasons[index] ?? "";
		if (want.length > 500 || reason.length > 500)
			errors.push("Please use at most 500 characters per wish field.");
		if (want.trim() || reason.trim())
			wishes.push({ want, so_that: reason.trim() ? reason : null });
	}
	return errors.length
		? { errors: [...new Set(errors)] }
		: { submission: { answers, wishes } };
}
