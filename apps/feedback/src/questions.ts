// ABOUTME: Defines the frozen coded questions for the workshop feedback form.
// ABOUTME: Shares stored IDs, labels, response kinds, and allowed options with the server.

type CheckboxGroup = "help" | "ai-use";

export type Question = {
	id: string;
	label: string;
	options: { value: string; label: string }[];
} & (
	| { kind: "choice" | "rating" | "text" }
	| { kind: "checkbox"; group: CheckboxGroup }
);

const confidenceOptions = [
	{ value: "1", label: "Not confident" },
	{ value: "2", label: "Slightly" },
	{ value: "3", label: "Fairly" },
	{ value: "4", label: "Very" },
	{ value: "0", label: "Not sure what this means" },
];

const agreementOptions = [
	{ value: "1", label: "Strongly disagree" },
	{ value: "2", label: "Disagree" },
	{ value: "3", label: "Agree" },
	{ value: "4", label: "Strongly agree" },
	{ value: "0", label: "Can't say" },
];

const helpAgreementOptions = [
	{ value: "1", label: "Strongly disagree" },
	{ value: "2", label: "Disagree" },
	{ value: "3", label: "Agree" },
	{ value: "4", label: "Strongly agree" },
	{ value: "0", label: "Did not use" },
];

const ratingQuestions = (
	entries: readonly (readonly [string, string])[],
	options: Question["options"],
): Question[] =>
	entries.map(([id, label]) => ({
		id,
		label,
		kind: "rating",
		options,
	}));

const checkboxQuestions = (
	group: CheckboxGroup,
	entries: readonly (readonly [string, string])[],
): Question[] =>
	entries.map(([id, label]) => ({
		id,
		label,
		kind: "checkbox",
		group,
		options: [{ value: "1", label }],
	}));

export const questions: Question[] = [
	{
		id: "a1_experience",
		label:
			"Before this workshop, how much programming experience did you have?",
		kind: "choice",
		options: [
			{ value: "none", label: "None" },
			{ value: "little", label: "A little (tutorials, small exercises)" },
			{ value: "some", label: "Some (small projects of my own)" },
			{ value: "regular", label: "Regular (often or professionally)" },
		],
	},
	{
		id: "a2_vibecoding",
		label:
			'Before this workshop, had you used AI to generate code ("vibecoding")?',
		kind: "choice",
		options: [
			{ value: "never", label: "Never" },
			{ value: "once", label: "Once or twice" },
			{ value: "occasionally", label: "Occasionally" },
			{ value: "regularly", label: "Regularly" },
		],
	},
	{
		id: "a3_ai_attitude",
		label: "How do you feel about using AI to learn programming now?",
		kind: "choice",
		options: [
			{ value: "mostly_sceptical", label: "Mostly sceptical" },
			{ value: "somewhat_sceptical", label: "Somewhat sceptical" },
			{ value: "somewhat_positive", label: "Somewhat positive" },
			{ value: "mostly_positive", label: "Mostly positive" },
			{ value: "no_opinion", label: "No opinion" },
		],
	},
	...ratingQuestions(
		[
			["b1_variables", "Variables"],
			["b1_drawing", "Drawing and drawing state (fill, stroke, background)"],
			["b1_coordinates", "Coordinates (100 × 100 canvas)"],
			["b1_arithmetic", "Arithmetic and expressions"],
			["b1_conditionals", "Conditionals (`if`/`else`)"],
			["b1_repeat", "Repetition (`repeat`, nested grids)"],
			["b1_functions", "Functions (`func`, return)"],
			["b1_random", "Randomness and seeds"],
			["b1_debugging", "Debugging (`print`, error messages)"],
		],
		confidenceOptions,
	),
	...ratingQuestions(
		[
			[
				"b2_focus",
				"The small number of language features helped me focus on understanding programming concepts.",
			],
			[
				"b2_limits_blocked",
				"GiC's limits stopped me from making something I wanted to make.",
			],
			[
				"b2_code_image",
				"I could tell how changes in my code changed the image.",
			],
			["b2_errors", "Error messages helped me understand what went wrong."],
		],
		agreementOptions,
	),
	{
		id: "b3_simplicity_moment",
		label:
			"Describe one moment when GiC's simplicity helped you or got in your way.",
		kind: "text",
		options: [],
	},
	...checkboxQuestions("help", [
		["c1_tutor", "GiC tutor (built-in agent/provided skill)"],
		["c1_chat", "External chat (ChatGPT, Claude.ai, …)"],
		[
			"c1_agent",
			"Coding agent working on your files (opencode, Claude Code, Codex, …)",
		],
		["c1_human", "Help from Fabian or other participants"],
		["c1_none", "None"],
	]),
	{
		id: "c2_main_help",
		label: "Which help did you use most?",
		kind: "choice",
		options: [
			{ value: "tutor", label: "GiC tutor (built-in agent/provided skill)" },
			{
				value: "chat",
				label: "External chat (ChatGPT, Claude.ai, …)",
			},
			{
				value: "agent",
				label:
					"Coding agent working on your files (opencode, Claude Code, Codex, …)",
			},
			{ value: "human", label: "Help from Fabian or other participants" },
			{ value: "none", label: "None" },
		],
	},
	...ratingQuestions(
		[
			[
				"c3_understand_why",
				"It helped me understand why my code behaved the way it did.",
			],
			["c3_own_thinking", "I did most of the thinking myself."],
			[
				"c3_accepted_unclear",
				"I accepted suggestions I did not fully understand.",
			],
			["c3_explain_code", "I could explain my final code to someone else."],
			["c3_learned_more", "Compared to the part without AI, I learned more."],
		],
		helpAgreementOptions,
	),
	{
		id: "c4_ai_situation",
		label:
			"Describe one suggestion you received from AI. What did you do with it, and how did it affect your understanding?",
		kind: "text",
		options: [],
	},
	...checkboxQuestions("ai-use", [
		["c5_hint", "Get a hint about what to try next"],
		["c5_understand", "Understand a programming concept or existing code"],
		["c5_debug", "Understand or fix an error"],
		["c5_generate", "Generate code"],
		["c5_modify", "Change or extend existing code"],
		["c5_explore", "Explore different visual ideas or approaches"],
		["c5_other", "Something else"],
	]),
	...ratingQuestions(
		[
			[
				"c6_ai_speed",
				"Using AI helped me make progress on my sketch more quickly.",
			],
		],
		agreementOptions.map((option) =>
			option.value === "0"
				? { ...option, label: "Can't say / did not use AI" }
				: option,
		),
	),
	{
		id: "d1_pace",
		label: "The pace of the workshop was…",
		kind: "choice",
		options: [
			{ value: "1", label: "Too slow" },
			{ value: "2", label: "Slightly slow" },
			{ value: "3", label: "About right" },
			{ value: "4", label: "Slightly fast" },
			{ value: "5", label: "Too fast" },
		],
	},
	...ratingQuestions(
		[
			["d2_explanations", "The explanations were clear."],
			["d2_practice_time", "I had enough time to practise."],
			["d2_editor", "The GiC editor worked without major problems."],
			["d2_docs", "The documentation and examples helped me."],
		],
		agreementOptions,
	),
	{
		id: "d3_continue",
		label: "Do you plan to keep programming after this workshop?",
		kind: "choice",
		options: [
			{ value: "no", label: "No" },
			{ value: "maybe", label: "Maybe" },
			{ value: "yes_gic", label: "Yes, with GiC" },
			{ value: "yes_other", label: "Yes, with another language or tool" },
		],
	},
	{
		id: "d4_keep",
		label: "What should stay the same?",
		kind: "text",
		options: [],
	},
	{
		id: "d5_change",
		label: "What should change first?",
		kind: "text",
		options: [],
	},
];
