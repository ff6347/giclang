// ABOUTME: Probes account-eligible OpenRouter models with bounded GIC reference tools.
// ABOUTME: Reports request status and tool metadata without printing private content.

import { readFile } from "node:fs/promises";
import { runModel } from "./reference-tool-probe.ts";

const models = [
	"z-ai/glm-5.3",
	"z-ai/glm-5.3-flash",
	"moonshotai/kimi-k3",
	"moonshotai/kimi-k2.7-code",
	"xiaomi/mimo-v2.6-flash",
	"xiaomi/mimo-v2.6-pro",
	"deepseek/deepseek-v4.1-flash",
	"deepseek/deepseek-v4-pro",
	"deepseek/deepseek-v4-flash",
] as const;

export function parseArguments(argv: string[]): {
	model: (typeof models)[number] | null;
	help: boolean;
	error: string | null;
} {
	if (argv.length === 1 && ["--help", "-h"].includes(argv[0]!))
		return { model: null, help: true, error: null };
	if (
		argv.length === 2 &&
		argv[0] === "--model" &&
		models.includes(argv[1] as (typeof models)[number])
	)
		return {
			model: argv[1] as (typeof models)[number],
			help: false,
			error: null,
		};
	return { model: null, help: false, error: "invalid arguments" };
}

async function main(): Promise<void> {
	const args = parseArguments(process.argv.slice(2));
	if (args.help) {
		console.info(
			`Usage: node scripts/openrouter-reference-smoke.ts --model ${models.join("|")}`,
		);
		return;
	}
	if (args.error || !args.model) {
		console.error("Invalid arguments. Use --help.");
		process.exitCode = 1;
		return;
	}
	const key = process.env.OPENROUTER_API_KEY;
	if (!key) {
		console.error("Missing OPENROUTER_API_KEY.");
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
	const result = await runModel(
		args.model,
		key,
		reference,
		"chat",
		"https://openrouter.ai/api/v1/chat/completions",
	);
	console.info(JSON.stringify(result.report));
	if (!result.passed) process.exitCode = 1;
}

if (import.meta.main) await main();
