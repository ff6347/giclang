// ABOUTME: Defines serializable render commands emitted by the GIC interpreter.
// ABOUTME: Keeps platform-neutral drawing intent separate from browser adapters.

export type Command = BackgroundCommand;

type BackgroundCommand = {
	type: "background";
	lightness: number;
	chroma: number;
	hue: number;
};
