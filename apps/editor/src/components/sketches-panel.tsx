// ABOUTME: Presents saved personal sketches in the desktop-only Sketches gallery.
// ABOUTME: Renders untrusted description Markdown without active links or images.

import { Button } from "@base-ui/react/button";
import { renderUserMarkdown } from "@giclang/content/user-markdown";
import type { SketchCard } from "../lib/sketch-gallery.ts";

export function SketchesPanel({
	cards,
	error,
	onOpen,
}: {
	readonly cards: readonly SketchCard[];
	readonly error: string | null;
	readonly onOpen: (entryId: string) => void;
}) {
	return (
		<section aria-label="Sketches" className="workspace-panel sketches-panel">
			<h2>Sketches</h2>
			{error !== null && <p role="alert">{error}</p>}
			{cards.length === 0 ? (
				<p>No saved sketches with enabled descriptions.</p>
			) : (
				<div className="sketches-grid">
					{cards.map((card) => (
						<article className="sketch-card" key={card.entryId}>
							<Button
								className="sketch-card-open"
								type="button"
								onClick={() => onOpen(card.entryId)}
							>
								{card.thumbnailDataUrl === null ? (
									<div
										aria-label="No saved preview"
										className="sketch-thumbnail-placeholder"
										role="img"
									/>
								) : (
									<img
										alt=""
										className="sketch-thumbnail"
										src={card.thumbnailDataUrl}
									/>
								)}
								<strong>{card.description.metadata.title}</strong>
							</Button>
							<div
								className="sketch-card-description"
								dangerouslySetInnerHTML={{
									__html: renderUserMarkdown(card.description.body),
								}}
							/>
						</article>
					))}
				</div>
			)}
		</section>
	);
}
