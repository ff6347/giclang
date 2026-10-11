// ABOUTME: Copies bundled text with transient in-button clipboard confirmation.
// ABOUTME: Keeps success announcements mounted and clipboard failures visibly accessible.

import { useEffect, useRef, useState } from "react";
import { Check } from "pixelarticons/react";
import { Button } from "@base-ui/react";

interface CopyButtonProps {
	readonly text: string;
	readonly label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
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
			await navigator.clipboard.writeText(text);
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
		<>
			<Button
				className={`application-button copy-button${status === "status" ? " copied" : ""}`}
				aria-label={label}
				type="button"
				disabled={copying}
				onClick={copy}
			>
				<span className="copy-label">{label}</span>
				<span
					className="copy-confirmation"
					aria-hidden="true"
					ref={confirmation}
				>
					<Check />
				</span>
			</Button>
			<p className="copy-status" role="status">
				{status === "status" ? "Copied to clipboard." : ""}
			</p>
			{status === "alert" && (
				<p className="copy-status" role="alert">
					Could not copy to clipboard.
				</p>
			)}
		</>
	);
}
