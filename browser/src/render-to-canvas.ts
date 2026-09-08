// ABOUTME: Renders ordered GIC drawing commands onto a browser Canvas.
// ABOUTME: Clears each preview and applies deterministic default drawing styles.
import type { Command } from "../../src/core";
import { colorToCanvasStyle } from "./color-conversion.ts";

export function renderToCanvas(canvas: HTMLCanvasElement, commands: Command[]) {
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas context is null");
	}
	clearCanvas(ctx, canvas);
	//default styles
	let currentFill = "white";
	let currentStroke = "black";
	let currentLineWidth = 1;
	let isStroked = true;
	let isFilled = true;
	ctx.lineWidth = currentLineWidth;
	ctx.fillStyle = currentFill;
	ctx.strokeStyle = currentStroke;

	for (const command of commands) {
		switch (command.type) {
			case "noFill":
				isFilled = false;
				break;
			case "noStroke":
				isStroked = false;
				break;
			case "strokeWidth":
				currentLineWidth = command.width;
				break;
			case "stroke":
				isStroked = true;
				currentStroke = colorToCanvasStyle(command.color);
				break;
			case "fill":
				isFilled = true;
				currentFill = colorToCanvasStyle(command.color);
				break;
			case "background":
				const color = command.color;
				ctx.fillStyle = colorToCanvasStyle(color);
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				break;
			case "circle":
				ctx.beginPath();
				ctx.arc(command.x, command.y, command.radius, 0, 2 * Math.PI);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
		}
	}
}

function applyStyles({
	ctx,
	currentFill,
	currentStroke,
	currentLineWidth,
	isFilled,
	isStroked,
}: {
	ctx: CanvasRenderingContext2D;
	currentFill: string;
	currentStroke: string;
	currentLineWidth: number;
	isFilled: boolean;
	isStroked: boolean;
}) {
	ctx.fillStyle = currentFill;
	ctx.strokeStyle = currentStroke;
	ctx.lineWidth = currentLineWidth;
	if (isFilled) {
		ctx.fill();
	}
	if (isStroked) {
		ctx.stroke();
	}
}

export function clearCanvas(
	ctx: CanvasRenderingContext2D,
	canvas: HTMLCanvasElement,
) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}
