// ABOUTME: Presents bundled examples without changing the active sketch when copying.
// ABOUTME: Offers transient in-button clipboard confirmation beside the existing load action.

import { useEffect, useRef, useState } from "react";
import { Check } from "pixelarticons/react";
import { Button } from "@base-ui/react";
import {
	createExampleCopyText,
	type ExampleContent,
} from "@giclang/content/model";
import { Markdown } from "./markdown.tsx";

function ExampleCard({
	example,
	onOpen,
}: {
	example: ExampleContent;
	onOpen: (id: string) => void;
}) {
	const [copying, setCopying] = useState(false);
	const [status, setStatus] = useState<"status" | "alert" | null>(null);
	const confirmation = useRef<HTMLSpanElement>(null);
	const feedbackTimeout = useRef<number | undefined>(undefined);
	const confirmationAnimation = useRef<Animation | undefined>(undefined);
	const mounted = useRef(false);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			window.clearTimeout(feedbackTimeout.current);
			confirmationAnimation.current?.cancel();
		};
	}, []);

	async function copy() {
		window.clearTimeout(feedbackTimeout.current);
		confirmationAnimation.current?.cancel();
		setStatus(null);
		setCopying(true);
		try {
			await navigator.clipboard.writeText(createExampleCopyText(example));
			if (!mounted.current) return;
			setStatus("status");
			if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				confirmationAnimation.current = confirmation.current?.animate(
					[
						{ opacity: 0, transform: "scale(0.5)", offset: 0 },
						{ opacity: 1, transform: "scale(1)", offset: 0.15 },
						{ opacity: 1, transform: "scale(1)", offset: 0.8 },
						{ opacity: 0, transform: "scale(0.5)", offset: 1 },
					],
					{ duration: 2_000, easing: "steps(3, end)" },
				);
			}
			feedbackTimeout.current = window.setTimeout(() => setStatus(null), 2_000);
		} catch {
			if (mounted.current) setStatus("alert");
		} finally {
			if (mounted.current) setCopying(false);
		}
	}

	return (
		<li className="content-card">
			<div className="content-card-content">
				<img
					alt={`${example.title} thumbnail`}
					className="example-thumbnail"
					height="100"
					src={example.thumbnailUrl}
					width="100"
				/>
				<div className="example-card-body">
					<h3>{example.title}</h3>
					<Markdown content={example} />
					<Button
						className="application-button"
						type="button"
						onClick={() => onOpen(example.id)}
					>
						Load this example
					</Button>
					<Button
						className={`application-button example-copy-button${status === "status" ? " copied" : ""}`}
						aria-label="Copy to clipboard"
						type="button"
						disabled={copying}
						onClick={copy}
					>
						<span className="copy-label">Copy to clipboard</span>
						<span
							className="copy-confirmation"
							aria-hidden="true"
							ref={confirmation}
						>
							<Check />
						</span>
					</Button>
					<p
						className="example-copy-status"
						role={status === "alert" ? "alert" : "status"}
					>
						{status === "status"
							? "Copied to clipboard."
							: status === "alert"
								? "Could not copy to clipboard."
								: ""}
					</p>
				</div>
			</div>
		</li>
	);
}

export function ExamplesPanel({
	examples,
	onOpen,
}: {
	examples: ExampleContent[];
	onOpen: (id: string) => void;
}) {
	return (
		<section className="workspace-panel padded-panel">
			<h2>Examples</h2>
			<ul className="content-card-list">
				{examples.map((example) => (
					<ExampleCard key={example.id} example={example} onOpen={onOpen} />
				))}
			</ul>
		</section>
	);
}
