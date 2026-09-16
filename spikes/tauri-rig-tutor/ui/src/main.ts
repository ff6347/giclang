import { tutorBridge } from "./bridge";

const question = document.querySelector<HTMLInputElement>("#question")!;
const reply = document.querySelector<HTMLOutputElement>("#reply")!;
document
	.querySelector("#ask")!
	.addEventListener("click", () => void tutorBridge.submit(question.value));
document
	.querySelector("#cancel")!
	.addEventListener("click", () => void tutorBridge.cancel());
void tutorBridge.onEvent((event) => {
	if (event.kind === "text") reply.value += event.text;
	if (event.kind === "error") reply.value = event.message;
});
