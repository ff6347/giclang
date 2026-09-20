// ABOUTME: Renders the Canvas preview and current-render export actions.
// ABOUTME: Keeps PNG and standalone HTML downloads beside the visible sketch.

import { Button } from "@base-ui/react/button";
import { Code, Download } from "pixelarticons/react";
import { type RefObject, useEffect } from "react";

export function PreviewPanel({
	canvasFrame,
	canvasRef,
	isCurrentSourceRendered,
	onDownloadStandalone,
}: {
	canvasFrame: boolean;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	isCurrentSourceRendered: boolean;
	onDownloadStandalone: () => void;
}) {
	useEffect(() => {
		canvasRef.current?.getContext("2d");
	}, [canvasRef]);

	const downloadPng = () => {
		const canvas = canvasRef.current;
		if (canvas === null) return;
		canvas.toBlob((blob) => {
			if (blob === null) return;
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "gic-sketch.png";
			link.click();
			URL.revokeObjectURL(url);
		}, "image/png");
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
