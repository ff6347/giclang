const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld(
	"gicDesktop",
	Object.freeze({
		documents: Object.freeze({
			open: () => ipcRenderer.invoke("document:open"),
			save: (documentId, source) =>
				ipcRenderer.invoke("document:save", { documentId, source }),
			saveAs: (source) => ipcRenderer.invoke("document:save-as", { source }),
		}),
		tutor: Object.freeze({
			probe: (mode) => ipcRenderer.invoke("tutor:probe", { mode }),
			cancel: () => ipcRenderer.invoke("tutor:cancel"),
			onChunk: (callback) => {
				const listener = (_event, chunk) => callback(chunk);
				ipcRenderer.on("tutor:chunk", listener);
				return () => ipcRenderer.removeListener("tutor:chunk", listener);
			},
		}),
		completeProbe: () => ipcRenderer.invoke("spike:complete"),
	}),
);
