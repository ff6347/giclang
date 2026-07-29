import { defineConfig } from "oxfmt";

export default defineConfig({
	printWidth: 80,
	tabWidth: 2,
	semi: true,
	singleQuote: false,
	useTabs: true,
	overrides: [
		{
			files: ["*.yml", "*.yaml"],
			options: {
				useTabs: false,
			},
		},
	],
});
