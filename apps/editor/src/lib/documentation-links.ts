// ABOUTME: Resolves relative Markdown links to bundled documentation pages.
// ABOUTME: Keeps external URLs and non-page links under normal browser handling.

const DOCS_URL = new URL("https://gic.invalid/docs/");

export function documentationTargetId(
	sourceId: string,
	href: string,
	docIds: ReadonlySet<string>,
): string | null | undefined {
	if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//")) {
		return undefined;
	}
	const path = href.split(/[?#]/, 1)[0];
	if (path === undefined || !path.endsWith(".md")) {
		return undefined;
	}
	if (path.startsWith("/")) {
		return null;
	}

	try {
		const target = new URL(href, new URL(`${sourceId}.md`, DOCS_URL));
		if (
			target.search !== "" ||
			!target.pathname.startsWith(DOCS_URL.pathname) ||
			!target.pathname.endsWith(".md")
		) {
			return null;
		}
		const id = decodeURIComponent(
			target.pathname.slice(DOCS_URL.pathname.length, -".md".length),
		);
		return docIds.has(id) ? id : null;
	} catch {
		return null;
	}
}
