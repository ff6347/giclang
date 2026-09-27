// ABOUTME: Defines structured output emitted by GIC print calls.
// ABOUTME: Carries formatted text and source-token location data.

export interface OutputEntry {
	text: string;
	line: number;
	start: number;
	end: number;
}
