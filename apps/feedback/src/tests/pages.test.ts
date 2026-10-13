// ABOUTME: Verifies server-rendered pages for the anonymous workshop feedback form.
// ABOUTME: Pins the frozen questionnaire metadata and presentation safety contracts.

import assert from "node:assert/strict";
import test from "node:test";

import { questions } from "../questions.ts";
import { formPage, loginPage } from "../pages.ts";

test("defines every frozen questionnaire item with its stored ID", () => {
	assert.deepEqual(
		questions.map((question) => question.id),
		[
			"a1_experience",
			"a2_vibecoding",
			"a3_ai_attitude",
			"b1_variables",
			"b1_drawing",
			"b1_coordinates",
			"b1_arithmetic",
			"b1_conditionals",
			"b1_repeat",
			"b1_functions",
			"b1_random",
			"b1_debugging",
			"b2_focus",
			"b2_limits_blocked",
			"b2_code_image",
			"b2_errors",
			"b3_simplicity_moment",
			"c1_tutor",
			"c1_chat",
			"c1_agent",
			"c1_human",
			"c1_none",
			"c2_main_help",
			"c3_understand_why",
			"c3_own_thinking",
			"c3_accepted_unclear",
			"c3_explain_code",
			"c3_learned_more",
			"c4_ai_situation",
			"d1_pace",
			"d2_explanations",
			"d2_practice_time",
			"d2_editor",
			"d2_docs",
			"d3_continue",
			"d4_keep",
			"d5_change",
		],
	);
});

test("renders the form with local assets, native controls, and twenty wish rows", () => {
	const page = formPage();

	assert.match(page, /<link rel="stylesheet" href="\/assets\/tokens\.css">/);
	assert.match(page, /<link rel="stylesheet" href="\/assets\/feedback\.css">/);
	assert.match(page, /<script src="\/assets\/form\.js" defer><\/script>/);
	assert.match(page, /<form method="post" action="\/submit">/);
	assert.match(page, /name="consent" value="1" required/);
	assert.match(page, /name="website" tabindex="-1" autocomplete="off"/);
	assert.match(page, /<fieldset>/);
	assert.match(page, /class="rating-table-wrap"/);
	assert.match(page, /class="opt-out"/);
	assert.match(page, /Conditionals \(<code>if<\/code>/);
	const wishMarkup =
		page.match(/<div id="wishes">([\s\S]*?)<\/div>\n<template/)?.[1] ?? "";
	assert.equal((wishMarkup.match(/name="want"/g) ?? []).length, 20);
	assert.equal((wishMarkup.match(/name="so_that"/g) ?? []).length, 20);
	assert.match(wishMarkup, /As a user I want to be able to <input name="want"/);
});

test("preserves and escapes invalid submission values", () => {
	const values = new URLSearchParams([
		["a1_experience", "little"],
		["b3_simplicity_moment", "</textarea><script>alert(1)</script>"],
		["want", '" onfocus="alert(1)'],
		["so_that", "I can use & learn"],
	]);
	const page = formPage(values, ["Consent is required."]);

	assert.match(page, /value="little" checked/);
	assert.match(
		page,
		/&lt;\/textarea&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/textarea>/,
	);
	assert.match(
		page,
		/value="(?:&quot;|&#34;) onfocus=(?:&quot;|&#34;)alert\(1\)"/,
	);
	assert.match(page, /value="I can use &amp; learn"/);
	assert.match(page, /Consent is required\./);
	assert.doesNotMatch(page, /<script>alert\(1\)<\/script>/);
	assert.doesNotMatch(
		page,
		/<input name="want" maxlength="500" value="" onfocus=/,
	);
});

test("escapes login errors", () => {
	assert.match(loginPage("<invalid>"), /&lt;invalid&gt;/);
});
