// ABOUTME: Resolves authored Markdown and HTML destinations at build time.
// ABOUTME: Patches positioned source spans without reserializing surrounding content.

import MarkdownIt from "markdown-it";
import { parse, postprocess, preprocess } from "micromark";
import { gfmTable } from "micromark-extension-gfm-table";
import { SAXParser } from "parse5-sax-parser";

interface Destination {
	readonly start: number;
	readonly end: number;
	readonly value: string;
	readonly encode: (value: string) => string;
}

interface HtmlLocation {
	readonly startOffset: number;
	readonly endOffset: number;
	readonly attrs?: Readonly<Record<string, HtmlLocation>>;
}

const markdown = new MarkdownIt();

function markdownDestination(value: string, literal: boolean): string {
	return value
		.replace(/&(?=#(?:\d+|[xX][\da-fA-F]+);|[a-zA-Z][a-zA-Z\d]+;)/g, "&amp;")
		.replace(literal ? /[\\|<>\r\n]/g : /[\\|()<>\s"]/g, (character) => {
			if (/[\\|()]/.test(character)) return `\\${character}`;
			return encodeURIComponent(character);
		});
}

function autolinkDestination(value: string): string {
	return value.replace(/[\\<>\s]/g, (character) =>
		encodeURIComponent(character),
	);
}

function htmlDestination(value: string, quote: string): string {
	return value.replace(/[&<>"'\s=`]/g, (character) => {
		if (character === "&") return "&amp;";
		if (character === "<") return "&lt;";
		if (character === ">") return "&gt;";
		if (character === quote || quote === "") {
			if (character === '"') return "&quot;";
			return `&#${character.charCodeAt(0)};`;
		}
		return character;
	});
}

/** Resolves decoded destinations; unchanged values retain their exact authored spelling. */
export function portableMarkdown(
	source: string,
	resolve: (destination: string) => string,
): string {
	const events = postprocess(
		parse({ extensions: [gfmTable()] })
			.document()
			.write(preprocess()(source, undefined, true)),
	);
	const destinations: Destination[] = [];
	const html: string[] = [];
	let htmlEnd = 0;

	function addMarkdownDestination(
		start: number,
		end: number,
		literal: boolean,
	) {
		destinations.push({
			start,
			end,
			value: markdown.utils.unescapeAll(source.slice(start, end)),
			encode: (value) => markdownDestination(value, literal),
		});
	}

	for (let index = 0; index < events.length; index++) {
		const event = events[index];
		if (!event || event[0] !== "enter") continue;
		const token = event[1];
		const start = token.start.offset;
		const end = token.end.offset;
		if (
			token.type === "resourceDestination" ||
			token.type === "definitionDestination"
		) {
			const literal = source[start] === "<";
			addMarkdownDestination(
				start + Number(literal),
				end - Number(literal),
				literal,
			);
		} else if (token.type === "resource") {
			// Empty resources have no destination token, including those with a title.
			let hasDestination = false;
			for (let next = index + 1; next < events.length; next++) {
				const candidate = events[next];
				if (!candidate || candidate[1] === token) break;
				if (candidate[1].type === "resourceDestination") hasDestination = true;
			}
			if (!hasDestination) addMarkdownDestination(start + 1, start + 1, false);
		} else if (token.type === "autolinkProtocol") {
			destinations.push({
				start,
				end,
				value: source.slice(start, end),
				encode: autolinkDestination,
			});
		} else if (token.type === "autolinkEmail") {
			destinations.push({
				start,
				end,
				value: `mailto:${source.slice(start, end)}`,
				encode: (value) =>
					autolinkDestination(
						value.startsWith("mailto:") ? value.slice(7) : value,
					),
			});
		} else if (token.type === "htmlFlowData" || token.type === "htmlText") {
			// Mask non-HTML spans but retain offsets and line endings for one HTML parse.
			html.push(
				source.slice(htmlEnd, start).replace(/[^\r\n]/g, " "),
				source.slice(start, end),
			);
			htmlEnd = end;
		}
	}

	if (html.length > 0) {
		const parser = new SAXParser({ sourceCodeLocationInfo: true });
		parser.on("startTag", (tag) => {
			for (const attribute of tag.attrs) {
				if (attribute.name !== "href" && attribute.name !== "src") continue;
				const location = (
					tag.sourceCodeLocation as HtmlLocation | null | undefined
				)?.attrs?.[attribute.name];
				if (!location) continue;
				const authored = source.slice(location.startOffset, location.endOffset);
				const prefix = /^(?:href|src)[ \t\r\n\f]*=[ \t\r\n\f]*/i.exec(authored);
				if (!prefix) continue;
				const first = authored[prefix[0].length];
				const quote = first === '"' || first === "'" ? first : "";
				const start =
					location.startOffset + prefix[0].length + Number(quote !== "");
				const end = location.endOffset - Number(quote !== "");
				destinations.push({
					start,
					end,
					value: attribute.value,
					encode: (value) => htmlDestination(value, quote),
				});
			}
		});
		parser.end(html.join(""));
	}

	let result = "";
	let offset = 0;
	for (const destination of destinations.toSorted(
		(left, right) => left.start - right.start,
	)) {
		const resolved = resolve(destination.value);
		if (resolved === destination.value) continue;
		result +=
			source.slice(offset, destination.start) + destination.encode(resolved);
		offset = destination.end;
	}
	return result + source.slice(offset);
}
