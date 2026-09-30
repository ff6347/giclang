// ABOUTME: Validates native gallery metadata and prepares visible sketch cards.
// ABOUTME: Keeps saved descriptions separate from immutable bundled examples.

import {
	parseSketchDescription,
	type SketchDescription,
} from "@giclang/content/sketch-description";

export interface SketchCandidate {
	readonly entryId: string;
	readonly description: string;
	readonly thumbnailDataUrl: string | null;
}

export interface SketchCard {
	readonly entryId: string;
	readonly description: SketchDescription;
	readonly thumbnailDataUrl: string | null;
}

export function prepareSketchCards(
	candidates: readonly SketchCandidate[],
): SketchCard[] {
	const cards: SketchCard[] = [];
	for (const candidate of candidates) {
		try {
			const description = parseSketchDescription(candidate.description);
			if (description.metadata.enabled) {
				cards.push({
					entryId: candidate.entryId,
					description,
					thumbnailDataUrl: candidate.thumbnailDataUrl,
				});
			}
		} catch {
			// A malformed bundle does not hide unrelated saved sketches.
		}
	}
	return cards.sort(
		(left, right) =>
			left.description.metadata.order - right.description.metadata.order ||
			left.description.metadata.title.localeCompare(
				right.description.metadata.title,
			),
	);
}
