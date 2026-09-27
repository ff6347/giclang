import type { DocumentationContent } from "@giclang/content/model";
import { Markdown } from "./markdown";

export function DocsPanel({ docs }: { docs: DocumentationContent[] }) {
	return (
		<article
			aria-label="Docs"
			className="workspace-panel padded-panel content-document"
		>
			{docs.map((doc) => (
				<section key={doc.id}>
					<h2>{doc.title}</h2>
					<Markdown content={doc} />
				</section>
			))}
		</article>
	);
}
