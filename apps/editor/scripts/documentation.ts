// ABOUTME: Publishes bundled editor documentation as complete Markdown and stable image assets.
// ABOUTME: Resolves portable content links to the canonical public website at build time.

import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { listContentFiles, readGicAgentSkill } from "@giclang/content/node";
import {
	createDocumentationCopyText,
	createDocumentationIndex,
	createDocumentationFullText,
	type DocumentationContent,
} from "@giclang/content/model";
import {
	compileMarkdown,
	compileSkillDocumentation,
	portableMarkdown,
} from "@giclang/content/markdown";

export function createDocumentationLinkResolver(
	documentPath: string,
	documentPaths: ReadonlySet<string>,
): (href: string) => string {
	return (href) => {
		if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return href;
		const url = new URL(href, `https://giclang.cc/${documentPath}`);
		if (
			href.startsWith("/") ||
			href.startsWith("#") ||
			href.startsWith("?") ||
			href === ""
		)
			return url.href;
		if (!documentPaths.has(decodeURIComponent(url.pathname.slice(1))))
			url.pathname = `/docs-assets${url.pathname}`;
		return url.href;
	};
}

async function documentationFiles() {
	const [files, skill] = await Promise.all([
		listContentFiles("docs"),
		readGicAgentSkill(),
	]);
	const documentPaths = new Set(
		files.filter((file) => file.kind === "markdown").map((file) => file.path),
	);
	const docs: DocumentationContent[] = [];
	const published = await Promise.all(
		files.map(async (file) => {
			if (file.kind !== "markdown") {
				return {
					path: `docs-assets/${file.path}`,
					source: await readFile(file.fileUrl),
					type:
						(
							{
								".png": "image/png",
								".svg": "image/svg+xml",
								".jpg": "image/jpeg",
								".jpeg": "image/jpeg",
								".webp": "image/webp",
								".gif": "image/gif",
							} as Record<string, string>
						)[extname(file.path)] ?? "application/octet-stream",
				};
			}
			const content =
				file.path === "docs/skill.md"
					? compileSkillDocumentation(
							file.path,
							file.source,
							skill.skillSource,
							skill.referenceSource,
						)
					: compileMarkdown(file.path, file.source);
			const doc = {
				...content,
				id: file.path.slice("docs/".length, -".md".length),
				markdown: portableMarkdown(
					content.markdown,
					createDocumentationLinkResolver(file.path, documentPaths),
				),
			};
			docs.push(doc);
			return {
				path: file.path,
				source: createDocumentationCopyText(doc),
				type: "text/markdown; charset=utf-8",
			};
		}),
	);
	return [
		...published,
		{
			path: "llms.txt",
			source: createDocumentationIndex(
				docs,
				(id) => `docs/${id}.md`,
				"llms-full.txt",
			),
			type: "text/plain; charset=utf-8",
		},
		{
			path: "llms-full.txt",
			source: createDocumentationFullText(
				docs,
				(id) => `https://giclang.cc/docs/${id}.md`,
			),
			type: "text/plain; charset=utf-8",
		},
	];
}

export function documentationExports(): Plugin {
	let config: ResolvedConfig;
	return {
		name: "gic-documentation-exports",
		configResolved(resolved) {
			config = resolved;
		},
		async generateBundle() {
			for (const file of await documentationFiles()) {
				this.emitFile({
					type: "asset",
					fileName: file.path,
					source: file.source,
				});
			}
		},
		async configurePreviewServer(server) {
			const documents = new Set(
				(
					await readdir(resolve(config.root, config.build.outDir, "docs"), {
						recursive: true,
					})
				)
					.filter((path) => path.endsWith(".md"))
					.map((path) => `docs/${path.replaceAll("\\", "/")}`),
			);
			server.middlewares.use(async (request, response, next) => {
				try {
					const pathname = new URL(request.url ?? "/", "https://gic.invalid")
						.pathname;
					if (!pathname.startsWith(config.base)) return next();
					const path = decodeURIComponent(pathname.slice(config.base.length));
					const textExport = path === "llms.txt" || path === "llms-full.txt";
					if (!documents.has(path) && !textExport) return next();
					const body = await readFile(
						resolve(config.root, config.build.outDir, path),
					);
					response.writeHead(200, {
						"content-type": textExport
							? "text/plain; charset=utf-8"
							: "text/markdown; charset=utf-8",
					});
					response.end(body);
				} catch (error) {
					if (error instanceof URIError) response.writeHead(400).end();
					else next(error);
				}
			});
		},
		configureServer(server) {
			server.middlewares.use(async (request, response, next) => {
				try {
					const pathname = decodeURIComponent(
						new URL(request.url ?? "/", "https://gic.invalid").pathname,
					);
					if (!pathname.startsWith(config.base)) return next();
					const path = pathname.slice(config.base.length);
					if (
						!(path.startsWith("docs/") && path.endsWith(".md")) &&
						!path.startsWith("docs-assets/") &&
						path !== "llms.txt" &&
						path !== "llms-full.txt"
					)
						return next();
					const file = (await documentationFiles()).find(
						(file) => file.path === path,
					);
					if (!file) {
						response.writeHead(404).end();
						return;
					}
					response.writeHead(200, { "content-type": file.type });
					response.end(file.source);
				} catch (error) {
					if (error instanceof URIError) response.writeHead(400).end();
					else next(error);
				}
			});
		},
	};
}
