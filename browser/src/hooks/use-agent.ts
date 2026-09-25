// ABOUTME: Owns deterministic agent state, cancellation, and local session persistence.
// ABOUTME: Sends sketch context only when the student explicitly submits a question.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DesktopHost } from "../lib/desktop-host.ts";
import {
	createDesktopAgent,
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

export function useAgent(
	context: AgentContext,
	sketchId: string,
	desktop?: DesktopHost,
	documentId?: string,
	model = "gpt-5.5",
	providerEnabled = false,
) {
	const provider = useMemo(
		() =>
			desktop === undefined || !providerEnabled
				? createDeterministicAgent()
				: createDesktopAgent(desktop, { model }),
		[desktop, model, providerEnabled],
	);
	const abortController = useRef<AbortController | null>(null);
	const [messages, setMessages] = useState<AgentMessage[]>(() =>
		loadMessages(sketchId),
	);
	const [status, setStatus] = useState<AgentStatus>("ready");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const sessionId = useRef<string | null>(null);
	const lastQuestion = useRef("");

	useEffect(() => {
		abortController.current?.abort();
		abortController.current = null;
		sessionId.current = null;
		setStatus("ready");
		setErrorMessage(null);
		if (desktop === undefined) {
			setMessages(loadMessages(sketchId));
			return;
		}
		if (documentId === undefined) {
			setMessages([]);
			setStatus("ready");
			return;
		}
		let disposed = false;
		void desktop
			.findAgentSession(documentId ?? "")
			.then(async (summary) => {
				if (disposed) return;
				if (summary === null) {
					setMessages([]);
					return;
				}
				sessionId.current = summary.sessionId;
				const records = await desktop.readAgentSession(
					documentId ?? "",
					summary.sessionId,
				);
				if (disposed) return;
				setMessages(
					records.flatMap((record) =>
						record.type === "message"
							? [{ role: record.role, text: record.text }]
							: [],
					),
				);
			})
			.catch(() => {
				if (!disposed) setStatus("error");
			});
		return () => {
			disposed = true;
		};
	}, [desktop, documentId, sketchId]);

	const startNewSession = useCallback(async () => {
		abortController.current?.abort();
		abortController.current = null;
		if (desktop === undefined) {
			localStorage.removeItem(sessionKey(sketchId));
			setMessages([]);
			setStatus("ready");
			return;
		}
		const created = await desktop.createAgentSession(
			"New session",
			documentId ?? "",
		);
		sessionId.current = created;
		setMessages([]);
		setStatus("ready");
	}, [desktop, documentId, sketchId]);

	const ensureSession = async (): Promise<string> => {
		if (desktop === undefined) return "local";
		if (sessionId.current !== null) return sessionId.current;
		const existing = await desktop.findAgentSession(documentId ?? "");
		if (existing !== null) {
			sessionId.current = existing.sessionId;
			return existing.sessionId;
		}
		const created = await desktop.createAgentSession(
			"Current sketch",
			documentId ?? "",
		);
		sessionId.current = created;
		return created;
	};

	const persist = (nextMessages: readonly AgentMessage[]) => {
		if (desktop !== undefined) return;
		const now = new Date().toISOString();
		const records: AgentSessionRecord[] = [
			{
				type: "session",
				id: "local",
				name: "Current sketch",
				startedAt: now,
				sketchId,
			},
			...nextMessages.map((message) => ({
				type: "message" as const,
				sessionId: "local",
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
		setErrorMessage(null);
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
			setErrorMessage(null);
			void (async () => {
				let answer = "";
				try {
					const activeSessionId = await ensureSession();
					if (desktop !== undefined) {
						await desktop.appendAgentMessage(
							documentId ?? "",
							activeSessionId,
							"student",
							trimmed,
						);
					}
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
					if (desktop !== undefined) {
						await desktop.appendAgentMessage(
							documentId ?? "",
							activeSessionId,
							"agent",
							answer,
						);
					}
					setStatus("ready");
				} catch (error) {
					if (!controller.signal.aborted) {
						setStatus("error");
						setErrorMessage(
							error instanceof Error
								? error.message
								: "The agent could not answer.",
						);
					}
				} finally {
					if (abortController.current === controller)
						abortController.current = null;
				}
			})();
		},
		[context, desktop, documentId, messages, provider, sketchId],
	);

	return {
		cancel,
		messages,
		startNewSession,
		status,
		errorMessage,
		submit,
		retry: () => submit(lastQuestion.current),
	};
}
