import type { MarkdownContent } from "@giclang/content/model";

export function Markdown({ content }: { content: MarkdownContent }) {
	return (
		<div
			className="content-markdown"
			dangerouslySetInnerHTML={{ __html: content.html }}
		/>
	);
}
