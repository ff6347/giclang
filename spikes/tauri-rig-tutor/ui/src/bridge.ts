import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type TutorEvent =
	| { kind: "text"; text: string }
	| { kind: "complete" | "cancelled" }
	| { kind: "error"; message: string };

// The sole Tauri-specific module. UI code gets a narrow capability, not IPC.
export const tutorBridge = {
	submit(question: string) {
		return invoke<void>("submit_question", { question });
	},
	cancel() {
		return invoke<void>("cancel_question");
	},
	onEvent(callback: (event: TutorEvent) => void) {
		return listen<TutorEvent>("gic:tutor-event", ({ payload }) =>
			callback(payload),
		);
	},
};
