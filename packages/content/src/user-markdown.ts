// ABOUTME: Renders sketch-authored Markdown without HTML or active resources.
// ABOUTME: Keeps user descriptions separate from trusted bundled content rendering.

import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
	breaks: true,
	html: false,
	linkify: false,
});

markdown.renderer.rules.link_open = () => "<span>";
markdown.renderer.rules.link_close = () => "</span>";
markdown.renderer.rules.image = (tokens, index, _options) => {
	const token = tokens[index];
	return token === undefined
		? ""
		: `<span>${markdown.utils.escapeHtml(token.content)}</span>`;
};

export function renderUserMarkdown(source: string): string {
	return markdown.render(source);
}
