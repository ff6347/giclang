// ABOUTME: Verifies destination-only Markdown portability using authored fixtures.
// ABOUTME: Covers exact source preservation, reference links, HTML, and code exclusions.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as markdown from "../markdown-content.ts";

const fixtures = [
	{
		name: "table cells bound inline code and retain escaped destination pipes",
		source:
			"| First | Second |\n| --- | --- |\n| `literal | [actual](./actual.md)` |\n| `[code](./literal.md)` | [pipe](./a\\|b.md) |\n",
		expected:
			"| First | Second |\n| --- | --- |\n| `literal | [actual](https://public.test/actual.md)` |\n| `[code](./literal.md)` | [pipe](https://public.test/a\\|b.md) |\n",
		destinations: ["./actual.md", "./a|b.md"],
	},
	{
		name: "resolved URLs that contain literal character-reference syntax",
		source: "[entity](./a.md?x=&amp;copy;) [numeric](<./a.md?x=&amp;#123;>)\n",
		expected:
			"[entity](https://public.test/a.md?x=&amp;copy;) [numeric](<https://public.test/a.md?x=&amp;#123;>)\n",
		destinations: ["./a.md?x=&copy;", "./a.md?x=&#123;"],
	},
	{
		name: "HTML non-ASCII whitespace is part of an unquoted attribute value",
		source: "<div><a href=\u00a0one.md>One</a></div>\n",
		expected: "<div><a href=https://public.test/%C2%A0one.md>One</a></div>\n",
		destinations: ["\u00a0one.md"],
	},
	{
		name: "source-ordered mixed HTML and Markdown destinations",
		source: '<a href="./first.md">First</a> [second](./second.md)\n',
		expected:
			'<a href="https://public.test/first.md">First</a> [second](https://public.test/second.md)\n',
		destinations: ["./first.md", "./second.md"],
	},
	{
		name: "multiline HTML within blockquotes and lists",
		source:
			'> <div>\r\n> <a\r\n> href="./one.md">One</a>\r\n> </div>\r\n\r\n- <div>\n  <img\n  src="./two.png">\n  </div>\n',
		expected:
			'> <div>\r\n> <a\r\n> href="https://public.test/one.md">One</a>\r\n> </div>\r\n\r\n- <div>\n  <img\n  src="https://public.test/two.png">\n  </div>\n',
		destinations: ["./one.md", "./two.png"],
	},
	{
		name: "autolinks retain literal escapes and entities rather than Markdown decoding",
		source: "<https://elsewhere.test/a\\(b)?x=&amp;y> <hi@example.test>\n",
		expected: "<https://elsewhere.test/a\\(b)?x=&amp;y> <hi@example.test>\n",
		destinations: [
			"https://elsewhere.test/a\\(b)?x=&amp;y",
			"mailto:hi@example.test",
		],
	},
	{
		name: "inline links, images, nested labels and URLs, and all title delimiters",
		source:
			"[**文 [label]**](./docs/a(b).md \"Keep title\") ![image](<./images/a b.png> 'Image title') [last](last.md (Title))\n",
		expected:
			"[**文 [label]**](https://public.test/docs/a\\(b\\).md \"Keep title\") ![image](<https://public.test/images/a%20b.png> 'Image title') [last](https://public.test/last.md (Title))\n",
		destinations: ["./docs/a(b).md", "./images/a b.png", "last.md"],
	},
	{
		name: "full, collapsed, shortcut, unused, duplicate, and image references",
		source:
			'[full][ref] [ref][] [ref] ![pic][img]\n\n[ref]: ./docs/ref.md "Reference title"\n[img]: <./images/ref.png>\n[unused]: unused.md\n[ref]: duplicate.md\n',
		expected:
			'[full][ref] [ref][] [ref] ![pic][img]\n\n[ref]: https://public.test/docs/ref.md "Reference title"\n[img]: <https://public.test/images/ref.png>\n[unused]: https://public.test/unused.md\n[ref]: https://public.test/duplicate.md\n',
		destinations: [
			"./docs/ref.md",
			"./images/ref.png",
			"unused.md",
			"duplicate.md",
		],
	},
	{
		name: "escaped URLs, entities, Unicode, emoji offsets, and CRLF",
		source:
			'😀 [Über](./a\\(b\\).md?x=1&amp;y=2 "t\\\"itle")\r\n\r\n[文]:\r\n  <./über.md>\r\n  "Título"\r\n',
		expected:
			'😀 [Über](https://public.test/a\\(b\\).md?x=1&y=2 "t\\\"itle")\r\n\r\n[文]:\r\n  <https://public.test/%C3%BCber.md>\r\n  "Título"\r\n',
		destinations: ["./a(b).md?x=1&y=2", "./über.md"],
	},
	{
		name: "list, blockquote, table formatting, tabs, and trailing spaces",
		source:
			"> - [One](./one.md)  \r\n>   ![Two](./two.png)\r\n\r\n| Name | Link |\r\n| :--- | ---: |\r\n| 文 | [Three](./three.md) |\r\n\r\n\t[code](./literal.md)\r\n",
		expected:
			"> - [One](https://public.test/one.md)  \r\n>   ![Two](https://public.test/two.png)\r\n\r\n| Name | Link |\r\n| :--- | ---: |\r\n| 文 | [Three](https://public.test/three.md) |\r\n\r\n\t[code](./literal.md)\r\n",
		destinations: ["./one.md", "./two.png", "./three.md"],
	},
	{
		name: "authored HTML attributes, quotes, entities, and raw text exclusions",
		source:
			'Text <a HREF = \'./one.md?x=1&amp;y=2\' title="href=\'literal.md\'">one</a>.\r\n\r\n<div data-src="literal.png">\r\n<img SRC=./two.png alt="src=literal.png">\r\n<a\r\n href = "./three.md">three</a>\r\n<!-- <a href="literal.md"> -->\r\n<script>const x = \'<a href="literal.md">\';</script>\r\n<style>/* <img src="literal.png"> */</style>\r\n<textarea><a href="literal.md"></textarea>\r\n</div>\r\n',
		expected:
			'Text <a HREF = \'https://public.test/one.md?x=1&amp;y=2\' title="href=\'literal.md\'">one</a>.\r\n\r\n<div data-src="literal.png">\r\n<img SRC=https://public.test/two.png alt="src=literal.png">\r\n<a\r\n href = "https://public.test/three.md">three</a>\r\n<!-- <a href="literal.md"> -->\r\n<script>const x = \'<a href="literal.md">\';</script>\r\n<style>/* <img src="literal.png"> */</style>\r\n<textarea><a href="literal.md"></textarea>\r\n</div>\r\n',
		destinations: ["./one.md?x=1&y=2", "./two.png", "./three.md"],
	},
	{
		name: "fenced and inline code, indented code, escaped labels, and Skill literals",
		source:
			'`[link](./literal.md)` ``<img src="literal.png">`` `references/language.md`\n\n```md\n[a](literal.md)\n[ref]: literal.md\n<img src="literal.png">\n```\n\n~~~html\n<a href="literal.md">\n~~~\n\n    [a](literal.md)\n    <img src="literal.png">\n\n\\[not a link](literal.md)\n[actual](./actual.md)\n',
		expected:
			'`[link](./literal.md)` ``<img src="literal.png">`` `references/language.md`\n\n```md\n[a](literal.md)\n[ref]: literal.md\n<img src="literal.png">\n```\n\n~~~html\n<a href="literal.md">\n~~~\n\n    [a](literal.md)\n    <img src="literal.png">\n\n\\[not a link](literal.md)\n[actual](https://public.test/actual.md)\n',
		destinations: ["./actual.md"],
	},
	{
		name: "host-owned external, fragment, root, query, and autolink decisions",
		source:
			"[external](https://elsewhere.test/a?x=1&amp;y=2) [mail](mailto:hi@example.test) [fragment](#part) [root](/docs/root) [query](?q=1) <https://elsewhere.test/a>\n",
		expected:
			"[external](https://elsewhere.test/a?x=1&amp;y=2) [mail](mailto:hi@example.test) [fragment](#part) [root](/docs/root) [query](?q=1) <https://elsewhere.test/a>\n",
		destinations: [
			"https://elsewhere.test/a?x=1&y=2",
			"mailto:hi@example.test",
			"#part",
			"/docs/root",
			"?q=1",
			"https://elsewhere.test/a",
		],
	},
];

describe("portable Markdown", () => {
	for (const fixture of fixtures) {
		it(fixture.name, () => {
			const destinations: string[] = [];
			const actual = markdown.portableMarkdown(
				fixture.source,
				(destination) => {
					destinations.push(destination);
					if (/^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(destination))
						return destination;
					return new URL(destination, "https://public.test/").href;
				},
			);
			assert.equal(actual, fixture.expected);
			assert.deepEqual(destinations, fixture.destinations);
		});

		it(`retains exact source when the resolver preserves ${fixture.name}`, () => {
			assert.equal(
				markdown.portableMarkdown(fixture.source, (destination) => destination),
				fixture.source,
			);
		});
	}

	it("rewrites URL and email autolinks without applying Markdown escape decoding", () => {
		assert.equal(
			markdown.portableMarkdown(
				"<https://elsewhere.test/a> <hi@example.test>\n",
				(destination) =>
					destination.startsWith("mailto:")
						? "mailto:next@example.test"
						: "https://public.test/a b\\(c)?x=&amp;y",
			),
			"<https://public.test/a%20b%5C(c)?x=&amp;y> <next@example.test>\n",
		);
	});

	it("escapes changed values for their existing Markdown and HTML context", () => {
		const source =
			'[a](old.md "title") [b](<old.md>) <a href="old.md">a</a> <img src=old.md>\n';
		const destination = "a b(c)\\d<e>\"f'&g";
		assert.equal(
			markdown.portableMarkdown(source, () => destination),
			'[a](a%20b\\(c\\)\\\\d%3Ce%3E%22f\'&g "title") [b](<a b(c)\\\\d%3Ce%3E"f\'&g>) <a href="a b(c)\\d&lt;e&gt;&quot;f\'&amp;g">a</a> <img src=a&#32;b(c)\\d&lt;e&gt;&quot;f&#39;&amp;g>\n',
		);
	});

	it("passes empty destinations to the host and propagates resolver errors", () => {
		const destinations: string[] = [];
		assert.equal(
			markdown.portableMarkdown(
				'[a]() ![b](<>) <a href=""></a>\n',
				(destination) => {
					destinations.push(destination);
					return "./target";
				},
			),
			'[a](./target) ![b](<./target>) <a href="./target"></a>\n',
		);
		assert.deepEqual(destinations, ["", "", ""]);
		assert.throws(
			() =>
				markdown.portableMarkdown("[a](./target)", () => {
					throw new Error("Resolver failed");
				}),
			/Resolver failed/,
		);
	});

	it("propagates HTML resolver failures synchronously", () => {
		assert.throws(
			() =>
				markdown.portableMarkdown('<a href="./target">text</a>', () => {
					throw new Error("HTML resolver failed");
				}),
			/HTML resolver failed/,
		);
	});

	it("leaves empty and malformed non-links untouched", () => {
		for (const source of [
			"",
			"[broken](a b)",
			"[missing][ref]",
			"![missing]",
			"plain references/language.md",
		]) {
			assert.equal(
				markdown.portableMarkdown(source, () => {
					throw new Error("Not a destination");
				}),
				source,
			);
		}
	});
});
