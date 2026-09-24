// ABOUTME: Presents the optional Socratic agent with explicit question submission.
// ABOUTME: Keeps response selection and copying disabled unless a student opts in.

import { useState, type KeyboardEvent } from "react";
import { Button } from "@base-ui/react/button";
import { Loading, Send, Stop } from "pixelarticons/react";
import { Streamdown, type Components } from "streamdown";
import "streamdown/styles.css";
import type { AgentMessage } from "../lib/agent.ts";
import type { AgentStatus } from "../hooks/use-agent.ts";

const markdownComponents: Components = {
	a: ({ children, node: _node, ...props }) => (
		<a {...props} rel="noreferrer" target="_blank">
			{children}
		</a>
	),
	code: ({ children, className, node: _node, ...props }) => (
		<code {...props} className={className}>
			{children}
		</code>
	),
	pre: ({ children, node: _node, ...props }) => (
		<pre {...props} className="agent-code-block">
			{children}
		</pre>
	),
};

export interface AgentActions {
	readonly cancel: () => void;
	readonly retry: () => void;
	readonly submit: (question: string) => void;
	readonly startNewSession: () => Promise<void>;
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
		const trimmed = question.trim();
		if (trimmed === "/new") {
			setQuestion("");
			void actions.startNewSession();
			return;
		}
		actions.submit(trimmed);
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
					<div
						className={`agent-message agent-message-${message.role}`}
						key={`${index}:${message.text}`}
					>
						<strong>{message.role === "student" ? "You" : "agent"}: </strong>
						<div
							className={
								allowCopying
									? "agent-response"
									: "agent-response agent-response-locked"
							}
						>
							{message.role === "agent" ? (
								<Streamdown
									animated={false}
									className="agent-markdown"
									components={markdownComponents}
									controls={false}
									isAnimating={
										status === "streaming" && index === messages.length - 1
									}
									lineNumbers={false}
									mode="streaming"
									parseIncompleteMarkdown
								>
									{message.text}
								</Streamdown>
							) : (
								message.text
							)}
						</div>
					</div>
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
