// ABOUTME: Loads the saved gallery for the currently configured desktop project.
// ABOUTME: Refreshes from native files without carrying catalog state across roots.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesktopHost } from "../lib/desktop-host.ts";
import {
	prepareSketchCards,
	type SketchCard,
	type SketchCandidate,
} from "../lib/sketch-gallery.ts";

export function useSketchGallery(
	desktop: DesktopHost | undefined,
	projectsDirectory: string | null,
) {
	const [cards, setCards] = useState<SketchCard[]>([]);
	const [error, setError] = useState<string | null>(null);
	const request = useRef(0);

	const refresh = useCallback(() => {
		if (desktop === undefined) {
			request.current += 1;
			setCards([]);
			return;
		}
		const currentRequest = ++request.current;
		setCards([]);
		void desktop
			.discoverSketches()
			.then((candidates: SketchCandidate[]) => {
				if (request.current !== currentRequest) return;
				setCards(prepareSketchCards(candidates));
				setError(null);
			})
			.catch(() => {
				if (request.current !== currentRequest) return;
				setError("GIC could not read the current project's sketches.");
			});
	}, [desktop]);

	useEffect(() => {
		refresh();
		return () => {
			request.current += 1;
		};
	}, [projectsDirectory, refresh]);

	return { cards, error, refresh };
}
