// ABOUTME: Presents the optional Socratic tutor with explicit question submission.
// ABOUTME: Keeps response selection and copying disabled unless a student opts in.

import { useState } from "react";
import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import type { TutorContext, TutorMessage } from "../lib/tutor.ts";
import type { TutorStatus } from "../hooks/use-tutor.ts";

export interface TutorActions {
	readonly cancel: () => void;
	readonly retry: () => void;
	readonly submit: (question: string) => void;
}

export function TutorPanel({
	actions,
	context,
	messages,
	status,
}: {
	readonly actions: TutorActions;
	readonly context: TutorContext;
	readonly messages: readonly TutorMessage[];
	readonly status: TutorStatus;
}) {
	const [question, setQuestion] = useState("");
	const [allowCopying, setAllowCopying] = useState(false);
	const submit = () => {
		actions.submit(question);
		setQuestion("");
	};
	return (
		<section aria-label="Tutor" className="workspace-panel tutor-panel">
			<div className="tutor-header">
				<h2>Tutor</h2>
				<label className="tutor-copy-setting">
					<input
						type="checkbox"
						checked={allowCopying}
						onChange={(event) => setAllowCopying(event.currentTarget.checked)}
					/>
					Allow copying
				</label>
			</div>
			<p className="tutor-guidance">
				Ask a question about the current sketch. Nothing is sent until you
				submit.
			</p>
			<div className="tutor-messages" aria-live="polite">
				{messages.map((message, index) => (
					<p
						className={`tutor-message tutor-message-${message.role}`}
						key={`${index}:${message.text}`}
					>
						<strong>{message.role === "student" ? "You" : "Tutor"}: </strong>
						<span className={allowCopying ? undefined : "tutor-response"}>
							{message.text}
						</span>
					</p>
				))}
				{status === "error" && (
					<p role="alert">The tutor could not answer. Try again.</p>
				)}
				{status === "cancelled" && <p>The question was cancelled.</p>}
			</div>
			<form
				className="tutor-form"
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
						Ask tutor
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
			<p className="tutor-context-note">
				Context: {context.diagnostics.length} diagnostics,{" "}
				{context.output.length} output entries.
			</p>
		</section>
	);
}
