// ABOUTME: Parses and serializes user-authored sketch descriptions.
// ABOUTME: Keeps editable metadata typed without granting bundled-content trust.

import { dump, load } from "js-yaml";
import {
	isBooleanField,
	isFiniteOrder,
	isNonEmptyTitle,
	isStringList,
} from "./metadata-validation.ts";

export interface SketchDescriptionMetadata {
	readonly title: string;
	readonly order: number;
	readonly enabled: boolean;
	readonly categories: string[];
	readonly tags: string[];
}

export interface SketchDescription {
	readonly metadata: SketchDescriptionMetadata;
	readonly body: string;
}

export function isSketchDescriptionMetadata(
	value: unknown,
): value is SketchDescriptionMetadata {
	if (typeof value !== "object" || value === null) return false;
	const metadata = value as Record<string, unknown>;
	return (
		isNonEmptyTitle(metadata.title) &&
		isFiniteOrder(metadata.order) &&
		isBooleanField(metadata.enabled) &&
		isStringList(metadata.categories) &&
		isStringList(metadata.tags)
	);
}

export function parseSketchDescription(source: string): SketchDescription {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source);
	if (match?.[1] === undefined || match[2] === undefined) {
		throw new Error("Sketch description frontmatter is missing.");
	}
	const metadata: unknown = load(match[1]);
	if (!isSketchDescriptionMetadata(metadata)) {
		throw new Error("Sketch description metadata is invalid.");
	}
	return {
		metadata: {
			title: metadata.title,
			order: metadata.order,
			enabled: metadata.enabled,
			categories: [...metadata.categories],
			tags: [...metadata.tags],
		},
		body: match[2],
	};
}

export function serializeSketchDescription(
	description: SketchDescription,
): string {
	if (!isSketchDescriptionMetadata(description.metadata)) {
		throw new Error("Sketch description metadata is invalid.");
	}
	const frontmatter = dump(
		{
			title: description.metadata.title,
			order: description.metadata.order,
			enabled: description.metadata.enabled,
			categories: description.metadata.categories,
			tags: description.metadata.tags,
		},
		{ lineWidth: -1, noRefs: true },
	);
	return `---\n${frontmatter}---\n${description.body}`;
}

export function defaultSketchDescription(title: string): SketchDescription {
	return {
		metadata: {
			title: title.trim() || "Untitled sketch",
			order: 0,
			enabled: true,
			categories: [],
			tags: [],
		},
		body: "",
	};
}
