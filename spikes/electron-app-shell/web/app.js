const desktop = window.gicDesktop;
const source = document.querySelector("#source");
const status = document.querySelector("#status");
const tutorOutput = document.querySelector("#tutor-output");
let documentId;

document.querySelector("#open").addEventListener("click", async () => {
	const document = await desktop.documents.open();
	if (document) {
		documentId = document.documentId;
		source.value = document.source;
		status.textContent = `Opened ${document.name}`;
	}
});

document.querySelector("#save").addEventListener("click", async () => {
	if (!documentId) {
		status.textContent = "Use Open or Save As first.";
		return;
	}
	await desktop.documents.save(documentId, source.value);
	status.textContent = "Saved.";
});

document.querySelector("#save-as").addEventListener("click", async () => {
	const document = await desktop.documents.saveAs(source.value);
	if (document) {
		documentId = document.documentId;
		status.textContent = `Saved ${document.name}`;
	}
});

const stopChunks = desktop.tutor.onChunk((chunk) => {
	tutorOutput.textContent += chunk;
});

status.textContent = "Packaged assets loaded.";
const completed = await desktop.tutor.probe("complete");
if (!completed.text.includes("What part")) {
	throw new Error("Deterministic Pi response did not cross the IPC boundary.");
}

const cancellation = desktop.tutor.probe("cancel");
await new Promise((resolve) => setTimeout(resolve, 100));
await desktop.tutor.cancel();
const cancelled = await cancellation;
if (!cancelled.aborted) {
	throw new Error("Deterministic Pi response was not cancelled.");
}

stopChunks();
status.textContent = "Electron and Pi probes passed.";
await desktop.completeProbe();
