// ABOUTME: Presents the optional Socratic agent with explicit question submission.
// ABOUTME: Keeps response selection and copying disabled unless a student opts in.

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import type { AgentContext, AgentMessage } from "../lib/agent.ts";
import type { AgentStatus } from "../hooks/use-agent.ts";

export interface AgentActions {
	readonly cancel: () => void;
	readonly retry: () => void;
	readonly submit: (question: string) => void;
}

export function AgentPanel({
	actions,
	context,
	messages,
	status,
}: {
	readonly actions: AgentActions;
	readonly context: AgentContext;
	readonly messages: readonly AgentMessage[];
	readonly status: AgentStatus;
}) {
	const [question, setQuestion] = useState("");
	const [allowCopying, setAllowCopying] = useState(false);
	const submit = () => {
		actions.submit(question);
		setQuestion("");
	};
	return (
		<section aria-label="Agent" className="workspace-panel agent-panel">
			<div className="agent-header">
				<h2>agent</h2>
				<label className="agent-copy-setting">
					<input
						type="checkbox"
						checked={allowCopying}
						onChange={(event) => setAllowCopying(event.currentTarget.checked)}
					/>
					Allow copying
				</label>
			</div>
			<p className="agent-guidance">
				Ask a question about the current sketch. Nothing is sent until you
				submit.
			</p>
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
				className="agent-form"
				onSubmit={(event) => {
					event.preventDefault();
					submit();
				}}
			>
				<Field.Root className="application-field">
					<Field.Label>Question</Field.Label>
					<Field.Control
						className="application-input"
						value={question}
						placeholder="What would you like to understand?"
						onChange={(event) => setQuestion(event.currentTarget.value)}
					/>
				</Field.Root>
				<div className="workspace-support-actions">
					<Button
						className="application-button"
						type="submit"
						disabled={status === "streaming"}
					>
						Ask agent
					</Button>
					<Button
						className="application-button"
						type="button"
						onClick={actions.cancel}
						disabled={status !== "streaming"}
					>
						Cancel
					</Button>
					{status === "error" && (
						<Button
							className="application-button"
							type="button"
							onClick={actions.retry}
						>
							Retry
						</Button>
					)}
				</div>
			</form>
			<p className="agent-context-note">
				Context: {context.diagnostics.length} diagnostics,{" "}
				{context.output.length} output entries.
			</p>
		</section>
	);
}
