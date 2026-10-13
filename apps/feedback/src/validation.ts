// ABOUTME: Validates questionnaire submissions using the displayed question allowlists.
// ABOUTME: Keeps skipped answers distinct from explicit opt-outs and stores ordered wishes.

import { z } from "zod";
import { questions } from "./questions.ts";

export type Answers = Record<string, string | number | null>;
export type Wish = { want: string; so_that: string | null };
export type Submission = { answers: Answers; wishes: Wish[] };

const answerFields: Record<string, z.ZodType<string | undefined>> = {};
for (const question of questions) {
	answerFields[question.id] = (
		question.kind === "text"
			? z
					.string()
					.max(2000, `${question.label} Please use at most 2,000 characters.`)
			: z.enum(["", ...question.options.map((option) => option.value)], {
					error: `Please choose a listed answer for: ${question.label}`,
				})
	).optional();
}
const wishFields = z
	.array(
		z.string().max(500, "Please use at most 500 characters per wish field."),
	)
	.max(20, "Please enter at most 20 wishes.")
	.default([]);
const submissionSchema = z
	.strictObject({
		answers: z.strictObject(answerFields),
		consent: z.literal("1", {
			error: "Please agree to the consent statement before submitting.",
		}),
		website: z.string().optional(),
		want: wishFields,
		so_that: wishFields,
	})
	.refine((values) => values.want.length === values.so_that.length, {
		message: "Each wish must have both input fields.",
	});

export const loginSchema = z.strictObject({ password: z.string() });

export function formFields(values: URLSearchParams): Record<string, unknown> {
	return Object.fromEntries(
		[...new Set(values.keys())].map((key) => {
			const entries = values.getAll(key);
			// Repeated scalar fields remain arrays so the schemas reject them.
			return [
				key,
				key === "want" || key === "so_that" || entries.length > 1
					? entries
					: entries[0],
			];
		}),
	);
}

export function validate(
	values: URLSearchParams,
): { errors: string[] } | { submission: Submission } {
	const { consent, website, want, so_that, ...rawAnswers } = formFields(values);
	const result = submissionSchema.safeParse({
		consent,
		website,
		want,
		so_that,
		answers: rawAnswers,
	});
	if (!result.success)
		return {
			errors: [...new Set(result.error.issues.map((issue) => issue.message))],
		};
	const fields = result.data;
	const answers: Answers = {};
	const hasHelp = questions.some(
		(q) => q.kind === "checkbox" && fields.answers[q.id] === "1",
	);
	for (const question of questions) {
		const value = fields.answers[question.id];
		if (question.kind === "text") {
			answers[question.id] = value?.trim() ? value : null;
		} else if (!value) {
			answers[question.id] = question.kind === "checkbox" && hasHelp ? 0 : null;
		} else {
			answers[question.id] =
				question.kind === "rating" || question.kind === "checkbox"
					? Number(value)
					: value;
		}
	}
	const wishes = fields.want
		.map((want, index) => ({
			want,
			so_that: fields.so_that[index]!.trim() ? fields.so_that[index]! : null,
		}))
		.filter((wish) => wish.want.trim() || wish.so_that);
	return { submission: { answers, wishes } };
}
