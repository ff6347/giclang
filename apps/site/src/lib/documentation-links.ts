// ABOUTME: Resolves copied documentation links to the canonical public website.
// ABOUTME: Normalizes source-relative page and asset paths independently of deployment bases.

const websiteOrigin = "https://giclang.cc";

export function createDocumentationLinkResolver(
	documentPath: string,
	documentPaths: ReadonlySet<string>,
): (href: string) => string {
	return (href) => {
		if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return href;
		const url = new URL(href, `${websiteOrigin}/${documentPath}`);
		if (
			href.startsWith("/") ||
			href.startsWith("#") ||
			href.startsWith("?") ||
			href === ""
		) {
			return url.href;
		}
		if (!documentPaths.has(decodeURIComponent(url.pathname.slice(1)))) {
			url.pathname = `/docs-assets${url.pathname}`;
		}
		return url.href;
	};
}
