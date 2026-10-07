// ABOUTME: Offers bundled GiC skill copying, source inspection, and ZIP download.
// ABOUTME: Keeps exports offline and provides selectable text when clipboard access fails.

import { useRef, useState } from "react";
import { gicAgentExport } from "../lib/content.ts";

export function SkillActions() {
	const [copying, setCopying] = useState(false);
	const [status, setStatus] = useState("");
	const fallback = useRef<HTMLDetailsElement>(null);
	const text = useRef<HTMLTextAreaElement>(null);

	async function copySkill() {
		setCopying(true);
		setStatus("");
		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error("Clipboard access is unavailable.");
			}
			await navigator.clipboard.writeText(gicAgentExport.copyText);
			if (fallback.current) fallback.current.open = false;
			setStatus("Skill and reference copied.");
		} catch {
			if (fallback.current) fallback.current.open = true;
			text.current?.focus();
			text.current?.select();
			setStatus(
				"Clipboard access is unavailable or was blocked. Copy the complete text below manually.",
			);
		} finally {
			setCopying(false);
		}
	}

	function downloadSkill() {
		setStatus("");
		try {
			const bytes = Uint8Array.from(
				atob(gicAgentExport.archiveBase64),
				(character) => character.charCodeAt(0),
			);
			const url = URL.createObjectURL(
				new Blob([bytes], { type: "application/zip" }),
			);
			const link = document.createElement("a");
			link.href = url;
			link.download = "gic-agent.zip";
			document.body.append(link);
			try {
				link.click();
			} finally {
				link.remove();
				setTimeout(() => URL.revokeObjectURL(url), 1_000);
			}
		} catch {
			setStatus(
				"The skill download could not be started. You can copy the complete text instead.",
			);
		}
	}

	return (
		<section className="skill-actions" aria-label="Skill actions">
			<div className="skill-action-buttons">
				<button
					type="button"
					className="application-button"
					disabled={copying}
					onClick={copySkill}
				>
					Copy skill and reference
				</button>
				<button
					type="button"
					className="application-button"
					onClick={downloadSkill}
				>
					Download skill (ZIP)
				</button>
			</div>
			<p role="status" aria-live="polite">
				{status}
			</p>
			<details ref={fallback}>
				<summary>Select text for manual copying</summary>
				<label>
					Skill and language reference text
					<textarea
						ref={text}
						readOnly
						value={gicAgentExport.copyText}
						rows={12}
					/>
				</label>
			</details>
			<details>
				<summary>Inspect original source files</summary>
				<h3>gic-agent/SKILL.md</h3>
				<pre>{gicAgentExport.skillSource}</pre>
				<h3>gic-agent/references/language.md</h3>
				<pre>{gicAgentExport.referenceSource}</pre>
			</details>
		</section>
	);
}
