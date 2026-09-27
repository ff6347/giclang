import type { MarkdownContent } from "@giclang/content/model";
import { Markdown } from "./markdown";

export function AboutPanel({ content }: { content: MarkdownContent }) {
	return (
		<section className="workspace-panel padded-panel">
			<h2>{content.title}</h2>
			<Markdown content={content} />
		</section>
	);
}
