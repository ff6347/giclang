import { parseArgs } from "node:util";
const HOST = process.env["FEEDBACK_HOST"];
const TOKEN = process.env["FEEDBACK_TOKEN"];

const { values } = parseArgs({
	options: {
		type: {
			type: "string",
			short: "t",
			default: "responses",
			options: ["responses", "wishes"],
		},
	},
});

const type = values.type;

if (!type) {
	throw new Error("type must be set");
}
if (!["responses", "wishes"].includes(type)) {
	throw new Error("type must be either 'responses' or 'wishes'");
}

if (!HOST || !TOKEN) {
	throw new Error("env var FEEDBACK_HOST and FEEDBACK_TOKEN must be set");
}

await fetch(`${HOST}/admin/export?table=${type}`, {
	headers: {
		Authorization: `Bearer ${TOKEN}`,
	},
})
	.then((res) => res.text())
	.then((data) => {
		console.log(data);
	});
