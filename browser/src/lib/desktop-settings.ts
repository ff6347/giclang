// ABOUTME: Queues desktop settings writes and exposes a close-time flush boundary.
// ABOUTME: Keeps application reads synchronous while native persistence remains ordered.

import type { ApplicationSettings } from "./application-settings.ts";

export type WriteSetting = (key: string, value: string) => Promise<void>;

export class DesktopSettings implements ApplicationSettings {
	readonly #values: Map<string, string>;
	readonly #writeSetting: WriteSetting;
	#writeFailed = false;
	#writes = Promise.resolve();

	constructor(values: Record<string, string>, writeSetting: WriteSetting) {
		this.#values = new Map(Object.entries(values));
		this.#writeSetting = writeSetting;
	}

	getItem(key: string): string | null {
		return this.#values.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.#values.set(key, value);
		this.#writes = this.#writes.then(async () => {
			try {
				await this.#writeSetting(key, value);
			} catch {
				this.#writeFailed = true;
			}
		});
	}

	async flush(): Promise<void> {
		await this.#writes;
		if (!this.#writeFailed) return;

		this.#writeFailed = false;
		for (const [key, value] of this.#values) {
			try {
				await this.#writeSetting(key, value);
			} catch {
				this.#writeFailed = true;
			}
		}
		if (this.#writeFailed) {
			throw new Error("Unable to save desktop settings.");
		}
	}
}
