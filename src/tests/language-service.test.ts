// ABOUTME: Verifies browser-neutral GIC diagnostics, assistance, and save formatting.
// ABOUTME: Pins scope-aware symbols, shared metadata, incomplete-source safety, and settings.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applySaveFormatting,
	completeSource,
	defaultLanguageServiceSettings,
	diagnoseSource,
	formatSourceDocument,
	hoverSource,
	signatureHelpSource,
} from "../language-service.ts";

function sourcePosition(markedSource: string): {
	source: string;
	position: number;
} {
	const position = markedSource.indexOf("|");
	assert.notEqual(position, -1);
	return {
		source: markedSource.slice(0, position) + markedSource.slice(position + 1),
		position,
	};
}

describe("language service", () => {
	it("returns parser and analyzer diagnostics without editor-specific values", () => {
		assert.deepEqual(diagnoseSource("circle(10, 10);"), [
			{
				end: 6,
				line: 0,
				message: "Function 'circle' expects 3 arguments, but got 2.",
				start: 0,
			},
		]);
	});

	it("completes keywords and built-ins from shared GIC metadata", () => {
		const { source, position } = sourcePosition("cir|");
		const completions = completeSource(source, position);

		assert.deepEqual(
			completions.filter(({ label }) => label === "circle"),
			[
				{
					documentation: "Draw a circle centered at (x, y).",
					kind: "function",
					label: "circle",
					replacement: { end: 3, start: 0 },
					signature: "circle(x: number, y: number, radius: number)",
				},
			],
		);
		assert.deepEqual(
			completions.find(({ label }) => label === "repeat"),
			{
				documentation: "Run a block over a numeric range.",
				kind: "keyword",
				label: "repeat",
				replacement: { end: 3, start: 0 },
			},
		);
	});

	it("offers only user declarations visible through analyzer scope", () => {
		const nested = sourcePosition(`let globalValue = 1;
func motif(size) {
	let functionValue = size;
	if (true) {
		let nestedValue = functionValue;
		nes|tedValue;
	}
	let laterValue = size;
	return;
}
let finalValue = globalValue;`);
		const nestedUserCompletions = completeSource(
			nested.source,
			nested.position,
		).filter(({ kind }) => kind === "variable" || kind === "user-function");

		assert.deepEqual(
			nestedUserCompletions.map(({ label }) => label),
			["functionValue", "globalValue", "motif", "nestedValue", "size"],
		);

		const topLevel = sourcePosition(`let globalValue = 1;
func motif(size) {
	let functionValue = size;
	return;
}
let finalValue = globalValue;
fin|alValue;`);
		const topLevelUserCompletions = completeSource(
			topLevel.source,
			topLevel.position,
		).filter(({ kind }) => kind === "variable" || kind === "user-function");

		assert.deepEqual(
			topLevelUserCompletions.map(({ label }) => label),
			["finalValue", "globalValue", "motif"],
		);
	});

	it("keeps local symbols available while their enclosing block is incomplete", () => {
		const marked = sourcePosition(`func motif(size) {
	let localValue = size;
	loc|`);
		const userCompletions = completeSource(
			marked.source,
			marked.position,
		).filter(({ kind }) => kind === "variable" || kind === "user-function");

		assert.deepEqual(
			userCompletions.map(({ label }) => label),
			["localValue", "motif", "size"],
		);

		const repeat = sourcePosition("repeat(i, 0, 3) {\n\ti|");
		assert.deepEqual(
			completeSource(repeat.source, repeat.position)
				.filter(({ kind }) => kind === "variable")
				.map(({ label }) => label),
			["i"],
		);
		assert.deepEqual(hoverSource(repeat.source, repeat.position), {
			contents: ["repeat variable i"],
			range: { end: 20, start: 19 },
		});
	});

	it("does not expose a variable inside its own initializer", () => {
		const marked = sourcePosition(`let prior = 1;
let current = cur|rent;`);
		const userCompletions = completeSource(
			marked.source,
			marked.position,
		).filter(({ kind }) => kind === "variable");

		assert.deepEqual(
			userCompletions.map(({ label }) => label),
			["prior"],
		);
		assert.equal(hoverSource(marked.source, marked.position), undefined);
	});

	it("does not suggest reserved or existing names at declaration positions", () => {
		const { source, position } = sourcePosition(`let size = 10;
let |value = size;`);

		assert.deepEqual(completeSource(source, position), []);
	});

	it("hovers keywords, built-ins, and visible user symbols safely", () => {
		assert.deepEqual(hoverSource("circle(", 2), {
			contents: [
				"circle(x: number, y: number, radius: number)",
				"Draw a circle centered at (x, y).",
			],
			range: { end: 6, start: 0 },
		});
		assert.deepEqual(hoverSource("repeat(", 2), {
			contents: ["repeat", "Run a block over a numeric range."],
			range: { end: 6, start: 0 },
		});

		const marked = sourcePosition(`let size = 10;
si|ze;`);
		assert.deepEqual(hoverSource(marked.source, marked.position), {
			contents: ["variable size"],
			range: { end: 19, start: 15 },
		});

		const parameter = sourcePosition(`func motif(si|ze) {
	return size;
}`);
		assert.deepEqual(hoverSource(parameter.source, parameter.position), {
			contents: ["variable size"],
			range: { end: 15, start: 11 },
		});
		assert.equal(hoverSource("@", 0), undefined);
	});

	it("reports active built-in and user-function signatures", () => {
		const builtIn = sourcePosition("circle(10, 2|");
		assert.deepEqual(signatureHelpSource(builtIn.source, builtIn.position), {
			activeParameter: 1,
			activeSignature: 0,
			signatures: [
				{
					documentation: "Draw a circle centered at (x, y).",
					label: "circle(x: number, y: number, radius: number)",
					parameters: [
						{ label: "x: number" },
						{ label: "y: number" },
						{ label: "radius: number" },
					],
				},
			],
		});

		const userFunction = sourcePosition(`func motif(size, count) {
	return size;
}
motif(10, |`);
		assert.deepEqual(
			signatureHelpSource(userFunction.source, userFunction.position),
			{
				activeParameter: 1,
				activeSignature: 0,
				signatures: [
					{
						label: "motif(size, count)",
						parameters: [{ label: "size" }, { label: "count" }],
					},
				],
			},
		);

		const overloaded = sourcePosition("fill(20, 30, |");
		assert.equal(
			signatureHelpSource(overloaded.source, overloaded.position)
				?.activeSignature,
			1,
		);
	});

	it("formats documents and applies the browser-neutral save setting", () => {
		const source = "if(true){circle(50,50,10);}";
		const formatted = `if (true) {
	circle(50, 50, 10);
}
`;

		assert.equal(formatSourceDocument(source), formatted);
		assert.deepEqual(defaultLanguageServiceSettings, {
			formatOnSave: true,
		});
		assert.equal(
			applySaveFormatting(source, defaultLanguageServiceSettings),
			formatted,
		);
		assert.equal(applySaveFormatting(source, { formatOnSave: false }), source);
	});
});
