// ABOUTME: Defines serializable render commands emitted by the GIC interpreter.
// ABOUTME: Keeps platform-neutral drawing intent separate from browser adapters.

export type Command =
	| BackgroundCommand
	| CircleCommand
	| FillCommand
	| NoFillCommand
	| NoStrokeCommand
	| StrokeCommand
	| StrokeWidthCommand;

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

type CircleCommand = {
	type: "circle";
	x: number;
	y: number;
	radius: number;
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
