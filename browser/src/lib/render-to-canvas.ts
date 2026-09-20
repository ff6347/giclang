// ABOUTME: Renders ordered GIC drawing commands onto a browser Canvas.
// ABOUTME: Clears each preview and applies deterministic default drawing styles.
import type { Command } from "../../../src/core";
import { colorToCanvasStyle } from "./color-conversion.ts";
import { degreeToRadians } from "./degree-to-radians.ts";

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
			case "point":
				ctx.beginPath();
				if (isStroked) {
					ctx.ellipse(
						command.x,
						command.y,
						currentLineWidth / 2,
						currentLineWidth / 2,
						0,
						0,
						2 * Math.PI,
					);
					ctx.fillStyle = currentStroke;
					ctx.fill();
				}

				break;
			case "line":
				ctx.beginPath();
				ctx.moveTo(command.x1, command.y1);
				ctx.lineTo(command.x2, command.y2);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled: false,
					isStroked,
				});
				break;
			case "triangle":
				ctx.beginPath();
				ctx.moveTo(command.x1, command.y1);
				ctx.lineTo(command.x2, command.y2);
				ctx.lineTo(command.x3, command.y3);
				ctx.closePath();
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
			case "quad":
				ctx.beginPath();
				ctx.moveTo(command.x1, command.y1);
				ctx.lineTo(command.x2, command.y2);
				ctx.lineTo(command.x3, command.y3);
				ctx.lineTo(command.x4, command.y4);
				ctx.closePath();
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
			case "rect":
				ctx.beginPath();
				ctx.rect(command.x, command.y, command.width, command.height);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
			case "ellipse":
				ctx.beginPath();
				ctx.ellipse(
					command.x,
					command.y,
					command.width / 2,
					command.height / 2,
					0,
					0,
					2 * Math.PI,
				);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
			case "circle":
				ctx.beginPath();
				ctx.ellipse(
					command.x,
					command.y,
					command.radius,
					command.radius,
					0,
					0,
					2 * Math.PI,
				);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled,
					isStroked,
				});
				break;
			case "arc":
				ctx.beginPath();
				ctx.arc(
					command.x,
					command.y,
					command.radius,
					degreeToRadians(command.startAngle),
					degreeToRadians(command.endAngle),
				);
				applyStyles({
					ctx,
					currentFill,
					currentStroke,
					currentLineWidth,
					isFilled: false,
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
