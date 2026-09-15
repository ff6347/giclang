import { readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";

export class DocumentStore {
	#nextId = 0;
	#paths = new Map();

	async openPath(path) {
		validateGicPath(path);
		const source = await readFile(path, "utf8");
		return this.#remember(path, source);
	}

	async savePath(path, source) {
		const normalizedPath = extname(path) === "" ? `${path}.gic` : path;
		validateGicPath(normalizedPath);
		await writeFile(normalizedPath, source, "utf8");
		return this.#remember(normalizedPath, source);
	}

	async save(documentId, source) {
		const path = this.#paths.get(documentId);
		if (!path) {
			throw new Error("Unknown document ID.");
		}
		await writeFile(path, source, "utf8");
	}

	#remember(path, source) {
		const documentId = `document-${this.#nextId++}`;
		this.#paths.set(documentId, path);
		return { documentId, name: basename(path), source };
	}
}

function validateGicPath(path) {
	if (extname(path).toLowerCase() !== ".gic") {
		throw new Error("GIC documents must use the .gic extension.");
	}
}
