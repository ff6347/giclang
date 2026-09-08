// ABOUTME: Defines serializable render commands emitted by the GIC interpreter.
// ABOUTME: Keeps platform-neutral drawing intent separate from browser adapters.

export type Command =
	| BackgroundCommand
	| CircleCommand
	| FillCommand
	| NoStrokeCommand;

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

type CircleCommand = {
	type: "circle";
	x: number;
	y: number;
	radius: number;
};

type NoStrokeCommand = {
	type: "noStroke";
};
