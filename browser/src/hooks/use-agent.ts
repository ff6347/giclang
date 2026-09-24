// ABOUTME: Owns deterministic agent state, cancellation, and local session persistence.
// ABOUTME: Sends sketch context only when the student explicitly submits a question.

import { useCallback, useEffect, useRef, useState } from "react";
import {
	createDeterministicAgent,
	parseAgentSession,
	serializeAgentSession,
	type AgentContext,
	type AgentMessage,
	type AgentSessionRecord,
} from "../lib/agent.ts";

const SESSION_KEY_PREFIX = "gic.agentSession:";

function sessionKey(sketchId: string): string {
	return `${SESSION_KEY_PREFIX}${encodeURIComponent(sketchId)}`;
}

export type AgentStatus = "ready" | "streaming" | "cancelled" | "error";

function loadMessages(sketchId: string): AgentMessage[] {
	const records = parseAgentSession(
		localStorage.getItem(sessionKey(sketchId)) ?? "",
	);
	return records.flatMap((record) =>
		record.type === "message" ? [{ role: record.role, text: record.text }] : [],
	);
}

export function useAgent(context: AgentContext, sketchId: string) {
	const provider = useRef(createDeterministicAgent()).current;
	const abortController = useRef<AbortController | null>(null);
	const [messages, setMessages] = useState<AgentMessage[]>(() =>
		loadMessages(sketchId),
	);
	const [status, setStatus] = useState<AgentStatus>("ready");

	useEffect(() => {
		abortController.current?.abort();
		abortController.current = null;
		setMessages(loadMessages(sketchId));
		setStatus("ready");
	}, [sketchId]);
	const lastQuestion = useRef("");

	const persist = (nextMessages: readonly AgentMessage[]) => {
		const sessionId = "local";
		const now = new Date().toISOString();
		const records: AgentSessionRecord[] = [
			{
				type: "session",
				id: sessionId,
				name: "Current sketch",
				startedAt: now,
				sketchId,
			},
			...nextMessages.map((message) => ({
				type: "message" as const,
				sessionId,
				role: message.role,
				text: message.text,
				at: now,
			})),
		];
		localStorage.setItem(sessionKey(sketchId), serializeAgentSession(records));
	};

	const cancel = useCallback(() => {
		abortController.current?.abort();
		abortController.current = null;
		setStatus("cancelled");
	}, []);

	const submit = useCallback(
		(question: string) => {
			const trimmed = question.trim();
			if (trimmed.length === 0) return;
			lastQuestion.current = trimmed;
			abortController.current?.abort();
			const controller = new AbortController();
			abortController.current = controller;
			const studentMessage: AgentMessage = { role: "student", text: trimmed };
			const nextMessages = [...messages, studentMessage];
			setMessages(nextMessages);
			persist(nextMessages);
			setStatus("streaming");
			void (async () => {
				let answer = "";
				try {
					for await (const chunk of provider.stream(
						{ question: trimmed, context },
						controller.signal,
					)) {
						answer += chunk;
						setMessages([
							...nextMessages,
							{ role: "agent" as const, text: answer },
						]);
					}
					if (controller.signal.aborted) return;
					const completed = [
						...nextMessages,
						{ role: "agent" as const, text: answer },
					];
					setMessages(completed);
					persist(completed);
					setStatus("ready");
				} catch {
					if (!controller.signal.aborted) setStatus("error");
				} finally {
					if (abortController.current === controller)
						abortController.current = null;
				}
			})();
		},
		[context, messages, provider, sketchId],
	);

	return {
		cancel,
		messages,
		status,
		submit,
		retry: () => submit(lastQuestion.current),
	};
}
