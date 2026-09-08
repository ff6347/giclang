// ABOUTME: Defines serializable render commands emitted by the GIC interpreter.
// ABOUTME: Keeps platform-neutral drawing intent separate from browser adapters.

export type Command =
	| BackgroundCommand
	| CircleCommand
	| FillCommand
	| NoFillCommand
	| NoStrokeCommand
	| StrokeCommand
	| StrokeWidthCommand
	| RectCommand
	| EllipseCommand
	| QuadCommand
	| PointCommand
	| LineCommand
	| TriangleCommand
	| ArcCommand;

export type Color =
	| {
			kind: "oklch";
			lightness: number;
			chroma: number;
			hue: number;
			alpha?: number;
	  }
	| {
			kind: "css";
			value: string;
	  };

type BackgroundCommand = {
	type: "background";
	color: Color;
};

type FillCommand = {
	type: "fill";
	color: Color;
};
type NoFillCommand = {
	type: "noFill";
};

type NoStrokeCommand = {
	type: "noStroke";
};

type StrokeCommand = {
	type: "stroke";
	color: Color;
};

type StrokeWidthCommand = {
	type: "strokeWidth";
	width: number;
};

type CircleCommand = {
	type: "circle";
	x: number;
	y: number;
	radius: number;
};

type EllipseCommand = {
	type: "ellipse";
	x: number;
	y: number;
	width: number;
	height: number;
};

type RectCommand = {
	type: "rect";
	x: number;
	y: number;
	width: number;
	height: number;
};

type QuadCommand = {
	type: "quad";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	x3: number;
	y3: number;
	x4: number;
	y4: number;
};

type PointCommand = {
	type: "point";
	x: number;
	y: number;
};

type LineCommand = {
	type: "line";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
};

type TriangleCommand = {
	type: "triangle";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	x3: number;
	y3: number;
};

type ArcCommand = {
	type: "arc";
	x: number;
	y: number;
	radius: number;
	startAngle: number;
	endAngle: number;
};
