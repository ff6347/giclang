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
let eventsReady = false;

function requestState(active: boolean) {
	connect.disabled = active;
	cancel.disabled = !active;
	byId<HTMLButtonElement>("send-zen").disabled = active;
	byId<HTMLButtonElement>("send-chatgpt").disabled = active;
	signIn.disabled = active;
	signOut.disabled = active;
}

function error(error: unknown) {
	status.textContent =
		error instanceof Error
			? error.message
			: "The action could not be completed.";
	requestState(false);
}
function present(event: TutorEvent) {
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
	} catch (cause) {
		error(cause);
	} finally {
		key.value = "";
	}
});
byId<HTMLButtonElement>("sign-in").addEventListener("click", () => {
	withEvents(() => {
		requestState(true);
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
	send(tutorBridge.sendOpenCode),
);
byId<HTMLButtonElement>("send-chatgpt").addEventListener("click", () =>
	send(tutorBridge.sendChatGpt),
);
requestState(false);
status.textContent = "Starting tutor connection…";
const eventSetupTimeout = window.setTimeout(() => {
	if (!eventsReady) {
		status.textContent =
			"Tutor event connection did not start. Restart the application.";
	}
}, 5_000);
void tutorBridge
	.onEvent(present)
	.then(() => {
		eventsReady = true;
		window.clearTimeout(eventSetupTimeout);
		status.textContent = "Ready.";
	})
	.catch(() => {
		window.clearTimeout(eventSetupTimeout);
		status.textContent =
			"Tutor event connection failed. Restart the application.";
	});
