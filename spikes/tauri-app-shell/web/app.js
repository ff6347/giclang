const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const source = document.querySelector("#source");
const status = document.querySelector("#status");
let documentId;

document.querySelector("#open").addEventListener("click", async () => {
	const document = await invoke("open_gic");
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
	await invoke("save_gic", { documentId, source: source.value });
	status.textContent = "Saved.";
});

document.querySelector("#save-as").addEventListener("click", async () => {
	const document = await invoke("save_gic_as", { source: source.value });
	if (document) {
		documentId = document.documentId;
		status.textContent = `Saved ${document.name}`;
	}
});

const stopListening = await listen("shell-probe", async () => {
	await invoke("probe_event_received");
	stopListening();
});

status.textContent = "Packaged assets loaded.";
const automatedProbe = await invoke("probe_ready");
if (automatedProbe) {
	await new Promise((resolve) => setTimeout(resolve, 250));
	await invoke("complete_probe");
}
