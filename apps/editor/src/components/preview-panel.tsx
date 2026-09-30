// ABOUTME: Renders the Canvas preview and current-render export actions.
// ABOUTME: Keeps PNG and standalone HTML downloads beside the visible sketch.

import { Button } from "@base-ui/react/button";
import { Code, Download } from "pixelarticons/react";
import { type RefObject, useEffect } from "react";

export function PreviewPanel({
	canvasFrame,
	canvasRef,
	capturePng,
	isCurrentSourceRendered,
	onDownloadStandalone,
	source,
	onSavePng,
}: {
	canvasFrame: boolean;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	capturePng: (source: string) => string | undefined;
	isCurrentSourceRendered: boolean;
	source: string;
	onDownloadStandalone: () => void;
	onSavePng: ((contents: Uint8Array) => Promise<boolean>) | undefined;
}) {
	useEffect(() => {
		canvasRef.current?.getContext("2d");
	}, [canvasRef]);

	const downloadPng = () => {
		const encoded = capturePng(source);
		if (encoded === undefined) return;
		const bytes = Uint8Array.from(atob(encoded), (character) =>
			character.charCodeAt(0),
		);
		const blob = new Blob([bytes], { type: "image/png" });
		if (onSavePng !== undefined) {
			void blob
				.arrayBuffer()
				.then((buffer) => onSavePng(new Uint8Array(buffer)))
				.catch(() => window.alert("GIC could not save the PNG export."));
			return;
		}
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "gic-sketch.png";
		link.click();
		URL.revokeObjectURL(url);
	};

	return (
		<section aria-label="Preview" className="workspace-panel preview-panel">
			<canvas
				className={canvasFrame ? "canvas-frame" : undefined}
				id="canvas"
				ref={canvasRef}
				width="100"
				height="100"
			></canvas>
			<Button
				aria-label="Download standalone HTML"
				className="preview-html-download"
				disabled={!isCurrentSourceRendered}
				type="button"
				onClick={onDownloadStandalone}
			>
				<Code aria-hidden="true" />
			</Button>
			<Button
				aria-label="Download PNG"
				className="preview-download"
				disabled={!isCurrentSourceRendered}
				type="button"
				onClick={downloadPng}
			>
				<Download aria-hidden="true" />
			</Button>
		</section>
	);
}
