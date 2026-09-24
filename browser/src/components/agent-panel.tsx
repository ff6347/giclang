// ABOUTME: Presents the optional Socratic agent with explicit question submission.
// ABOUTME: Keeps response selection and copying disabled unless a student opts in.

import { useState, type KeyboardEvent } from "react";
import { Button } from "@base-ui/react/button";
import { Loading, Send, Stop } from "pixelarticons/react";
import type { AgentMessage } from "../lib/agent.ts";
import type { AgentStatus } from "../hooks/use-agent.ts";

export interface AgentActions {
	readonly cancel: () => void;
	readonly retry: () => void;
	readonly submit: (question: string) => void;
}

export function AgentPanel({
	actions,
	allowCopying,
	messages,
	status,
}: {
	readonly actions: AgentActions;
	readonly allowCopying: boolean;
	readonly messages: readonly AgentMessage[];
	readonly status: AgentStatus;
}) {
	const [question, setQuestion] = useState("");
	const submit = () => {
		actions.submit(question);
		setQuestion("");
	};
	const resizeInput = (input: HTMLTextAreaElement) => {
		input.style.height = "auto";
		input.style.height = `${input.scrollHeight}px`;
	};
	const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	};
	return (
		<section
			aria-label="Agent"
			className="workspace-panel padded-panel agent-panel"
		>
			<div className="agent-messages" aria-live="polite">
				{messages.map((message, index) => (
					<p
						className={`agent-message agent-message-${message.role}`}
						key={`${index}:${message.text}`}
					>
						<strong>{message.role === "student" ? "You" : "agent"}: </strong>
						<span className={allowCopying ? undefined : "agent-response"}>
							{message.text}
						</span>
					</p>
				))}
				{status === "error" && (
					<p role="alert">The agent could not answer. Try again.</p>
				)}
				{status === "cancelled" && <p>The question was cancelled.</p>}
			</div>
			<form
				className="agent-composer"
				onSubmit={(event) => {
					event.preventDefault();
					if (status !== "streaming") submit();
				}}
			>
				<textarea
					aria-label="Message agent"
					className="agent-input"
					rows={1}
					value={question}
					onChange={(event) => {
						setQuestion(event.currentTarget.value);
						resizeInput(event.currentTarget);
					}}
					onKeyDown={handleInputKeyDown}
				/>
				<Button
					aria-label={status === "streaming" ? "Stop agent" : "Send message"}
					className="agent-send"
					type={status === "streaming" ? "button" : "submit"}
					onClick={status === "streaming" ? actions.cancel : undefined}
				>
					{status === "streaming" ? (
						<>
							<Loading aria-hidden="true" className="agent-progress-icon" />
							<Stop aria-hidden="true" />
						</>
					) : (
						<Send aria-hidden="true" />
					)}
				</Button>
			</form>
			{status === "error" && (
				<Button
					className="application-button"
					type="button"
					onClick={actions.retry}
				>
					Retry
				</Button>
			)}
		</section>
	);
}
