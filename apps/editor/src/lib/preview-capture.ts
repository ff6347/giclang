// ABOUTME: Captures only the Canvas image accepted for the matching source.
// ABOUTME: Keeps sketch-save thumbnails tied to current successful previews.

export function capturePreviewPng(
	canvas: HTMLCanvasElement | null,
	renderedSource: string | undefined,
	expectedSource: string,
): string | undefined {
	if (canvas === null || renderedSource !== expectedSource) return undefined;
	try {
		const dataUrl = canvas.toDataURL("image/png");
		if (!dataUrl.startsWith("data:image/png;base64,")) return undefined;
		return dataUrl.slice("data:image/png;base64,".length);
	} catch {
		return undefined;
	}
}
