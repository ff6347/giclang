import {
	createDocumentationCopyText,
	type DocumentationContent,
} from "@giclang/content/model";
import { documentationTargetId } from "../lib/documentation-links.ts";
import { CopyButton } from "./copy-button.tsx";
import { Markdown } from "./markdown";
import { SkillActions } from "./skill-actions.tsx";

interface DocsPanelProps {
	readonly doc: DocumentationContent;
	readonly docIds: ReadonlySet<string>;
	readonly onOpen: (id: string) => void;
}

export function DocsPanel({ doc, docIds, onOpen }: DocsPanelProps) {
	return (
		<article
			aria-label={doc.title}
			className="workspace-panel padded-panel bounded-panel content-document"
			data-document-id={doc.id}
			onClick={(event) => {
				const target = event.target;
				if (!(target instanceof Element)) return;
				const link = target.closest("a[href]");
				if (link === null || !event.currentTarget.contains(link)) return;
				const href = link.getAttribute("href");
				if (href === null) return;
				const targetId = documentationTargetId(doc.id, href, docIds);
				if (targetId === undefined) return;
				event.preventDefault();
				if (targetId === null) {
					window.alert("This documentation page is unavailable.");
				} else {
					onOpen(targetId);
				}
			}}
		>
			<h2>{doc.title}</h2>
			<CopyButton text={createDocumentationCopyText(doc)} label="Copy page" />
			{doc.id === "skill" && <SkillActions />}
			<Markdown content={doc} />
		</article>
	);
}
