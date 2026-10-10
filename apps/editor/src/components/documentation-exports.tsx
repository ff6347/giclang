// ABOUTME: Offers bundled documentation index and full-text exports in shared editor Docs.
// ABOUTME: Copies and downloads without network requests or changes to the active sketch.

import {
	createDocumentationFullText,
	createDocumentationIndex,
} from "@giclang/content/model";
import { productContent } from "../lib/content.ts";
import { CopyButton } from "./copy-button.tsx";

const pageUrl = (id: string) => `https://giclang.cc/docs/${id}.md`;
const fullText = createDocumentationFullText(productContent.docs, pageUrl);
const index = createDocumentationIndex(
	productContent.docs,
	pageUrl,
	"https://giclang.cc/llms-full.txt",
);
const indexDownload = `data:text/plain;charset=utf-8,${encodeURIComponent(index)}`;
const fullTextDownload = `data:text/plain;charset=utf-8,${encodeURIComponent(fullText)}`;

export function DocumentationExports() {
	return (
		<section aria-label="Documentation exports">
			<div className="documentation-export-actions">
				<a href={indexDownload} download="llms.txt">
					Download documentation index
				</a>
				<CopyButton text={fullText} label="Copy all docs" />
				<a href={fullTextDownload} download="llms-full.txt">
					Download all docs
				</a>
			</div>
			<p>
				All documentation may exceed chat input limits. Copy one page with “Copy
				page” or download all docs instead.
			</p>
		</section>
	);
}
