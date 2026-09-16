import { tutorBridge, type TutorEvent } from "./bridge";

const byId = <T extends HTMLElement>(id: string) =>
	document.querySelector<T>(`#${id}`)!;
const key = byId<HTMLInputElement>("api-key");
const prompt = byId<HTMLTextAreaElement>("prompt");
const reply = byId<HTMLOutputElement>("reply");
const status = byId<HTMLParagraphElement>("status");
const deviceCode = byId<HTMLOutputElement>("device-code");
const openAuth = byId<HTMLButtonElement>("open-auth");

function error(error: unknown) {
	status.textContent =
		error instanceof Error
			? error.message
			: "The action could not be completed.";
}
function present(event: TutorEvent) {
	if (event.kind === "text") reply.value += event.text ?? "";
	if (event.kind === "status" || event.kind === "error")
		status.textContent = event.message ?? "";
	if (event.kind === "complete") status.textContent = "Response complete.";
	if (event.kind === "cancelled") status.textContent = "Response cancelled.";
	if (event.kind === "signed_out") {
		status.textContent = "Signed out.";
		deviceCode.value = "";
		openAuth.disabled = true;
	}
	if (event.kind === "device_authorization") {
		deviceCode.value = `User code: ${event.user_code}`;
		openAuth.disabled = false;
		status.textContent = "Open the authorization page, then return here.";
	}
}
function send(action: (text: string) => Promise<void>) {
	reply.value = "";
	void action(prompt.value).catch(error);
}

byId<HTMLButtonElement>("connect").addEventListener("click", async () => {
	try {
		await tutorBridge.connectOpenCode(key.value);
		status.textContent = "OpenCode Zen connected for this app session.";
	} catch (cause) {
		error(cause);
	} finally {
		key.value = "";
	}
});
byId<HTMLButtonElement>("sign-in").addEventListener(
	"click",
	() => void tutorBridge.beginChatGptSignIn().catch(error),
);
byId<HTMLButtonElement>("open-auth").addEventListener(
	"click",
	() => void tutorBridge.openChatGptAuthorization().catch(error),
);
byId<HTMLButtonElement>("sign-out").addEventListener(
	"click",
	() => void tutorBridge.signOutChatGpt().catch(error),
);
byId<HTMLButtonElement>("cancel").addEventListener(
	"click",
	() => void tutorBridge.cancel(),
);
byId<HTMLButtonElement>("send-zen").addEventListener("click", () =>
	send(tutorBridge.sendOpenCode),
);
byId<HTMLButtonElement>("send-chatgpt").addEventListener("click", () =>
	send(tutorBridge.sendChatGpt),
);
void tutorBridge.onEvent(present);
