import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { DocumentStore } from "./document-store.js";
import { PiRuntime } from "./pi-runtime.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const documents = new DocumentStore();
const pi = new PiRuntime();
let mainWindow;

async function recordEvidence(event, details = {}) {
	const path = process.env.GIC_ELECTRON_SPIKE_EVIDENCE;
	if (path) {
		await appendFile(
			path,
			`${JSON.stringify({ event, ...details })}\n`,
			"utf8",
		);
	}
}

function registerIpc() {
	ipcMain.handle("document:open", async () => {
		const result = await dialog.showOpenDialog(mainWindow, {
			filters: [{ name: "GIC sketch", extensions: ["gic"] }],
			properties: ["openFile"],
		});
		if (result.canceled || !result.filePaths[0]) {
			return undefined;
		}
		return documents.openPath(result.filePaths[0]);
	});

	ipcMain.handle("document:save", (_event, { documentId, source }) =>
		documents.save(documentId, source),
	);

	ipcMain.handle("document:save-as", async (_event, { source }) => {
		const result = await dialog.showSaveDialog(mainWindow, {
			defaultPath: "sketch.gic",
			filters: [{ name: "GIC sketch", extensions: ["gic"] }],
		});
		if (result.canceled || !result.filePath) {
			return undefined;
		}
		return documents.savePath(result.filePath, source);
	});

	ipcMain.handle("tutor:probe", async (event, { mode }) => {
		await recordEvidence("pi-modules-imported");
		const result = await pi.probe({
			mode,
			onChunk(chunk) {
				event.sender.send("tutor:chunk", chunk);
			},
		});
		await recordEvidence(
			result.aborted ? "pi-stream-cancelled" : "pi-stream-complete",
			{ text: result.text },
		);
		return result;
	});

	ipcMain.handle("tutor:cancel", () => pi.cancel());

	ipcMain.handle("spike:complete", async () => {
		await recordEvidence("renderer-callback-complete");
		if (process.env.GIC_ELECTRON_SPIKE_EVIDENCE) {
			mainWindow.close();
		}
	});
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 900,
		height: 700,
		webPreferences: {
			preload: join(root, "preload.cjs"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
	mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
	mainWindow.on("close", () => {
		void recordEvidence("close-requested");
	});
	void mainWindow.loadFile(join(root, "web", "index.html"));
}

app.whenReady().then(async () => {
	registerIpc();
	await recordEvidence("main-ready", {
		electron: process.versions.electron,
		chromium: process.versions.chrome,
		node: process.versions.node,
		v8: process.versions.v8,
	});
	createWindow();
});

app.on("window-all-closed", () => app.quit());
