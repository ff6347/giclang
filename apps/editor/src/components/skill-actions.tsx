// ABOUTME: Links to the bundled GiC skill ZIP and the website's raw plaintext version.
// ABOUTME: Uses the same two ordinary links in desktop and browser editor Docs.

import { gicAgentExport } from "../lib/content.ts";

export function SkillActions() {
	return (
		<section className="skill-actions" aria-label="Skill actions">
			<a
				href={`data:application/zip;base64,${gicAgentExport.archiveBase64}`}
				download="gic-agent.zip"
			>
				Download skill (ZIP)
			</a>
			<a
				href="https://giclang.cc/skills/gic-agent.txt"
				target="_blank"
				rel="noopener noreferrer"
			>
				View raw skill
			</a>
		</section>
	);
}
