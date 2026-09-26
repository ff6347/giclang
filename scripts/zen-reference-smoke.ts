// ABOUTME: Probes documented Zen models with bounded GIC reference tools.
// ABOUTME: Uses an explicit model list and prints only status and completion metadata.

import { readFile } from "node:fs/promises";
import { runModel } from "./reference-tool-probe.ts";
import {
	chatModels,
	messageModels,
	protocolFor,
	responseModels,
	type Model,
} from "./zen-reference-protocol.ts";

const models: Model[] = ["big-pickle", "gpt-6-luna", "claude-sonnet-5"];
const availableModels: Model[] = [
	...chatModels,
	...responseModels,
	...messageModels,
];

export function parseArguments(argv: string[]): {
	model: Model | null;
	help: boolean;
	error: string | null;
} {
	if (argv.length === 1 && ["--help", "-h"].includes(argv[0]!))
		return { model: null, help: true, error: null };
	if (
		argv.length === 2 &&
		argv[0] === "--model" &&
		availableModels.includes(argv[1] as Model)
	)
		return { model: argv[1] as Model, help: false, error: null };
	if (argv.length === 0) return { model: null, help: false, error: null };
	return { model: null, help: false, error: "invalid arguments" };
}

function endpoint(model: Model): string {
	return protocolFor(model) === "chat"
		? "https://opencode.ai/zen/v1/chat/completions"
		: protocolFor(model) === "responses"
			? "https://opencode.ai/zen/v1/responses"
			: "https://opencode.ai/zen/v1/messages";
}

async function main(): Promise<void> {
	const args = parseArguments(process.argv.slice(2));
	if (args.help) {
		console.info(
			`Usage: node scripts/zen-reference-smoke.ts [--model ${availableModels.join("|")}]`,
		);
		return;
	}
	if (args.error) {
		console.error("Invalid arguments. Use --help.");
		process.exitCode = 1;
		return;
	}
	const key = process.env.OPENCODE_API_KEY;
	if (!key) {
		console.error("Missing OPENCODE_API_KEY.");
		process.exitCode = 1;
		return;
	}
	const reference = await readFile(
		new URL(
			"../src-tauri/workspace/gic-tutor/references/language.md",
			import.meta.url,
		),
		"utf8",
	);
	for (const model of args.model ? [args.model] : models) {
		const result = await runModel(
			model,
			key,
			reference,
			protocolFor(model),
			endpoint(model),
		);
		console.info(JSON.stringify(result.report));
		if (!result.passed) process.exitCode = 1;
	}
}

if (import.meta.main) await main();
