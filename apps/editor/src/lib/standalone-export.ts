// ABOUTME: Builds and downloads one editable offline HTML artifact from GIC source.
// ABOUTME: Embeds Vite-built core and Canvas bundles without external runtime requests.

async function asset(name: string): Promise<string> {
	const response = await fetch(`/standalone/${name}.js`);
	if (!response.ok) throw new Error(`Could not load standalone ${name}.`);
	return response.text();
}

export function standaloneHtml(
	source: string,
	runtime: string,
	worker: string,
) {
	return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GIC sketch</title>
<style>
* { box-sizing: border-box; }
body {
	background: #cccccc;
	color: black;
	font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;
	font-weight: normal;
	margin: 0;
	padding: 1rem;
}
main {
	display: grid;
	gap: 1rem;
	margin: 0 auto;
	max-width: 80rem;
}
header, section, .editor, .preview {
	background: white;
	border: 2px solid black;
	box-shadow: 4px 4px 0 black;
	padding: 1rem;
}
h1, h2 { margin-top: 0; }
h1 { font-size: 1.25rem; }
h2 { font-size: 1rem; }
label { display: block; font-weight: bold; }
textarea {
	border: 2px solid black;
	font: inherit;
	margin-top: 0.5rem;
	min-height: 18rem;
	padding: 0.5rem;
	resize: vertical;
	width: 100%;
}
canvas {
	border: 2px solid black;
	display: block;
	height: auto;
	image-rendering: pixelated;
	max-width: 100px;
	width: 100px;
}
pre { margin-bottom: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
@media (min-width: 48rem) {
	main { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
	header { grid-column: 1 / -1; }
	.editor { grid-row: span 3; }
}
</style>
<main>
<header><h1>Gestalten in Code</h1><p>Editable standalone sketch</p></header>
<div class="editor"><label>Source<textarea aria-label="Source" rows="12"></textarea></label></div>
<div class="preview"><canvas width="100" height="100"></canvas></div>
<section><h2>Diagnostics</h2><pre id="diagnostics"></pre></section>
<section><h2>Output</h2><pre id="output"></pre></section>
</main>
<script>${runtime}\nGicStandaloneRuntime.startStandalonePreview(${JSON.stringify(source)}, ${JSON.stringify(worker)});</script>
</html>`;
}

export async function createStandaloneHtml(source: string): Promise<string> {
	const [runtime, worker] = await Promise.all([
		asset("runtime"),
		asset("worker"),
	]);
	return standaloneHtml(source, runtime, worker);
}

export async function downloadStandaloneHtml(source: string) {
	const html = await createStandaloneHtml(source);
	const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
	const link = document.createElement("a");
	link.download = "gic-sketch.html";
	link.href = url;
	link.click();
	URL.revokeObjectURL(url);
}
