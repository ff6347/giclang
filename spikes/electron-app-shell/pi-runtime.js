import { Agent } from "@earendil-works/pi-agent-core";
import { createFauxCore, fauxAssistantMessage } from "@earendil-works/pi-ai";

export class PiRuntime {
	#activeAgent;

	async probe({ mode = "complete", onChunk = () => {} } = {}) {
		if (this.#activeAgent) {
			throw new Error("A tutor response is already active.");
		}

		const faux = createFauxCore({
			provider: `gic-electron-${mode}`,
			tokensPerSecond: mode === "cancel" ? 1 : 1000,
			tokenSize: { min: 1, max: 1 },
		});
		const response =
			mode === "cancel"
				? "This deliberately long deterministic response must be cancelled before it completes."
				: "What part of the sketch would you like to examine first?";
		faux.setResponses([fauxAssistantMessage(response)]);

		const chunks = [];
		let aborted = false;
		const agent = new Agent({
			initialState: {
				model: faux.getModel(),
				systemPrompt: "Ask questions; do not write the student's solution.",
				tools: [],
			},
			streamFn: faux.streamSimple,
		});
		this.#activeAgent = agent;
		const unsubscribe = agent.subscribe((event) => {
			if (
				event.type === "message_update" &&
				event.assistantMessageEvent.type === "text_delta"
			) {
				const chunk = event.assistantMessageEvent.delta;
				chunks.push(chunk);
				onChunk(chunk);
			}
			if (
				event.type === "message_end" &&
				event.message.role === "assistant" &&
				event.message.stopReason === "aborted"
			) {
				aborted = true;
			}
		});

		try {
			await agent.prompt("Help me think about my current GIC sketch.");
			return { text: chunks.join(""), aborted };
		} finally {
			unsubscribe();
			this.#activeAgent = undefined;
		}
	}

	cancel() {
		const wasActive = this.#activeAgent !== undefined;
		this.#activeAgent?.abort();
		return wasActive;
	}
}
