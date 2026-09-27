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
	onSavePng,
}: {
	canvasFrame: boolean;
	canvasRef: RefObject<HTMLCanvasElement | null>;
	isCurrentSourceRendered: boolean;
	onDownloadStandalone: () => void;
	onSavePng: ((contents: Uint8Array) => Promise<boolean>) | undefined;
}) {
	useEffect(() => {
		canvasRef.current?.getContext("2d");
	}, [canvasRef]);

	const downloadPng = () => {
		if (
			onSavePng !== undefined &&
			import.meta.env.VITE_GIC_EXPORT_DEBUG === "1"
		) {
			console.info("GIC export PNG: click");
		}
		const canvas = canvasRef.current;
		if (canvas === null) return;
		canvas.toBlob((blob) => {
			if (
				onSavePng !== undefined &&
				import.meta.env.VITE_GIC_EXPORT_DEBUG === "1"
			) {
				console.info("GIC export PNG: canvas result", blob?.size ?? null);
			}
			if (blob === null) return;
			if (onSavePng !== undefined) {
				void blob
					.arrayBuffer()
					.then((buffer) => onSavePng(new Uint8Array(buffer)))
					.then((saved) => {
						if (import.meta.env.VITE_GIC_EXPORT_DEBUG === "1") {
							console.info("GIC export PNG: native result", saved);
						}
					})
					.catch((error: unknown) => {
						if (import.meta.env.VITE_GIC_EXPORT_DEBUG === "1") {
							console.error("GIC export PNG: failure", error);
						}
						window.alert("GIC could not save the PNG export.");
					});
				return;
			}
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
