// .prettierrc.mjs
/** @type {import("prettier").Config} */
export default {
	plugins: ["prettier-plugin-astro"],

	tabWidth: 2,
	semi: true,
	singleQuote: false,
	useTabs: true,
	printWidth: 80,
	overrides: [
		{
			files: ["*.yml", "*.yaml"],
			options: {
				useTabs: false,
			},
		},
	],
};
