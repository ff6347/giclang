import { tutorBridge, type TutorEvent } from "./bridge";

const byId = <T extends HTMLElement>(id: string) =>
	document.querySelector<T>(`#${id}`)!;
const key = byId<HTMLInputElement>("api-key");
const prompt = byId<HTMLTextAreaElement>("prompt");
const reply = byId<HTMLOutputElement>("reply");
const status = byId<HTMLParagraphElement>("status");
const deviceCode = byId<HTMLOutputElement>("device-code");
const openAuth = byId<HTMLButtonElement>("open-auth");
const connect = byId<HTMLButtonElement>("connect");
const signIn = byId<HTMLButtonElement>("sign-in");
const signOut = byId<HTMLButtonElement>("sign-out");
const cancel = byId<HTMLButtonElement>("cancel");
const diagnostics = byId<HTMLTextAreaElement>("diagnostics");
let eventsReady = false;

function appendDiagnostic(message: string) {
	const time = new Date().toISOString().slice(11, 23);
	diagnostics.value += `[${time}] ${message}\n`;
	diagnostics.scrollTop = diagnostics.scrollHeight;
}

function describe(event: TutorEvent): string {
	switch (event.kind) {
		case "status":
			return `status: ${event.message ?? ""}`;
		case "diagnostic":
			return `host: ${event.message ?? ""}`;
		case "text":
			return `assistant text chunk (${event.text?.length ?? 0} characters)`;
		case "error":
			return `error: ${event.message}`;
		case "device_authorization":
			return "ChatGPT device authorization received";
		case "signed_in":
			return "ChatGPT sign-in completed";
		case "signed_out":
			return "ChatGPT sign-out completed";
		case "complete":
			return "provider response completed";
		case "cancelled":
			return "provider request cancelled";
	}
}

function requestState(active: boolean) {
	connect.disabled = active;
	cancel.disabled = !active;
	byId<HTMLButtonElement>("send-zen").disabled = active;
	byId<HTMLButtonElement>("send-chatgpt").disabled = active;
	signIn.disabled = active;
	signOut.disabled = active;
}

function error(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: typeof error === "string"
				? error
				: "The action could not be completed.";
	status.textContent = message;
	appendDiagnostic(`command error: ${message}`);
	requestState(false);
}
function present(event: TutorEvent) {
	appendDiagnostic(describe(event));
	if (event.kind === "text") reply.value += event.text ?? "";
	if (event.kind === "status" || event.kind === "error")
		status.textContent = event.message ?? "";
	if (event.kind === "complete") {
		status.textContent = "Response complete.";
		requestState(false);
	}
	if (event.kind === "cancelled") {
		status.textContent = "Response cancelled.";
		requestState(false);
	}
	if (event.kind === "error") requestState(false);
	if (event.kind === "signed_in") {
		status.textContent = "ChatGPT sign-in complete.";
		deviceCode.value = "";
		openAuth.disabled = true;
		requestState(false);
	}
	if (event.kind === "signed_out") {
		status.textContent = "Signed out.";
		deviceCode.value = "";
		openAuth.disabled = true;
		requestState(false);
	}
	if (event.kind === "device_authorization") {
		deviceCode.value = `User code: ${event.user_code}`;
		openAuth.disabled = false;
		status.textContent = "Open the authorization page, then return here.";
	}
}
function withEvents(action: () => void) {
	if (!eventsReady) {
		status.textContent =
			"The tutor connection is still starting. Try again in a moment.";
		return;
	}
	action();
}
function send(action: (text: string) => Promise<void>) {
	if (!eventsReady) {
		status.textContent =
			"The tutor connection is still starting. Try again in a moment.";
		return;
	}
	reply.value = "";
	requestState(true);
	void action(prompt.value).catch(error);
}

connect.addEventListener("click", async () => {
	try {
		await tutorBridge.connectOpenCode(key.value);
		status.textContent = "OpenCode Zen connected for this app session.";
		appendDiagnostic("OpenCode API key accepted into Rust session memory");
	} catch (cause) {
		error(cause);
	} finally {
		key.value = "";
	}
});
byId<HTMLButtonElement>("sign-in").addEventListener("click", () => {
	withEvents(() => {
		requestState(true);
		appendDiagnostic("requesting ChatGPT device authorization");
		void tutorBridge.beginChatGptSignIn().catch(error);
	});
});
byId<HTMLButtonElement>("open-auth").addEventListener(
	"click",
	() => void tutorBridge.openChatGptAuthorization().catch(error),
);
byId<HTMLButtonElement>("sign-out").addEventListener("click", () =>
	withEvents(() => {
		void tutorBridge.signOutChatGpt().catch(error);
	}),
);
cancel.addEventListener("click", () => void tutorBridge.cancel());
byId<HTMLButtonElement>("send-zen").addEventListener("click", () =>
	send((text) => {
		appendDiagnostic(`submitting OpenCode prompt (${text.length} characters)`);
		return tutorBridge.sendOpenCode(text);
	}),
);
byId<HTMLButtonElement>("send-chatgpt").addEventListener("click", () =>
	send((text) => {
		appendDiagnostic(`submitting ChatGPT prompt (${text.length} characters)`);
		return tutorBridge.sendChatGpt(text);
	}),
);
byId<HTMLButtonElement>("clear-diagnostics").addEventListener("click", () => {
	diagnostics.value = "";
});
requestState(false);
status.textContent = "Starting tutor connection…";
appendDiagnostic("registering Tauri event listener");
const eventSetupTimeout = window.setTimeout(() => {
	if (!eventsReady) {
		status.textContent =
			"Tutor event connection did not start. Restart the application.";
		appendDiagnostic("Tauri event listener timed out");
	}
}, 5_000);
void tutorBridge
	.onEvent(present)
	.then(() => {
		eventsReady = true;
		window.clearTimeout(eventSetupTimeout);
		status.textContent = "Ready.";
		appendDiagnostic("Tauri event listener ready");
	})
	.catch(() => {
		window.clearTimeout(eventSetupTimeout);
		status.textContent =
			"Tutor event connection failed. Restart the application.";
		appendDiagnostic("Tauri event listener failed");
	});
