import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type TutorEvent =
	| { kind: "status" | "text"; message?: string; text?: string }
	| { kind: "complete" | "cancelled" | "signed_out" }
	| { kind: "error"; message: string }
	| { kind: "device_authorization"; url: string; user_code: string };

// Narrow named capabilities: no generic IPC is made available to UI code.
export const tutorBridge = {
	connectOpenCode: (apiKey: string) =>
		invoke<void>("connect_opencode", { apiKey }),
	beginChatGptSignIn: () => invoke<void>("begin_chatgpt_sign_in"),
	openChatGptAuthorization: () =>
		invoke<void>("open_chatgpt_authorization_url"),
	signOutChatGpt: () => invoke<void>("sign_out_chatgpt"),
	sendOpenCode: (prompt: string) =>
		invoke<void>("send_opencode_prompt", { prompt }),
	sendChatGpt: (prompt: string) =>
		invoke<void>("send_chatgpt_prompt", { prompt }),
	cancel: () => invoke<void>("cancel_tutor_request"),
	onEvent: (callback: (event: TutorEvent) => void) =>
		listen<TutorEvent>("gic:tutor-event", ({ payload }) => callback(payload)),
};
