// ABOUTME: Owns deterministic tutor state, cancellation, and local session persistence.
// ABOUTME: Sends sketch context only when the student explicitly submits a question.

import { useCallback, useEffect, useRef, useState } from "react";
import {
	createDeterministicTutor,
	parseTutorSession,
	serializeTutorSession,
	type TutorContext,
	type TutorMessage,
	type TutorSessionRecord,
} from "../lib/tutor.ts";

const SESSION_KEY_PREFIX = "gic.tutorSession:";

function sessionKey(sketchId: string): string {
	return `${SESSION_KEY_PREFIX}${encodeURIComponent(sketchId)}`;
}

export type TutorStatus = "ready" | "streaming" | "cancelled" | "error";

function loadMessages(sketchId: string): TutorMessage[] {
	const records = parseTutorSession(
		localStorage.getItem(sessionKey(sketchId)) ?? "",
	);
	return records.flatMap((record) =>
		record.type === "message" ? [{ role: record.role, text: record.text }] : [],
	);
}

export function useTutor(context: TutorContext, sketchId: string) {
	const provider = useRef(createDeterministicTutor()).current;
	const abortController = useRef<AbortController | null>(null);
	const [messages, setMessages] = useState<TutorMessage[]>(() =>
		loadMessages(sketchId),
	);
	const [status, setStatus] = useState<TutorStatus>("ready");

	useEffect(() => {
		abortController.current?.abort();
		abortController.current = null;
		setMessages(loadMessages(sketchId));
		setStatus("ready");
	}, [sketchId]);
	const lastQuestion = useRef("");

	const persist = (nextMessages: readonly TutorMessage[]) => {
		const sessionId = "local";
		const now = new Date().toISOString();
		const records: TutorSessionRecord[] = [
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
		localStorage.setItem(sessionKey(sketchId), serializeTutorSession(records));
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
			const studentMessage: TutorMessage = { role: "student", text: trimmed };
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
					}
					if (controller.signal.aborted) return;
					const completed = [
						...nextMessages,
						{ role: "tutor" as const, text: answer },
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
