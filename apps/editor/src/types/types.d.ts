// ABOUTME: Declares the sanitized HTML APIs used for browser diagnostics.
// ABOUTME: Extends Element and ShadowRoot with their HTML replacement methods.

declare module "*?skill-export" {
	const content: {
		readonly copyText: string;
		readonly skillSource: string;
		readonly referenceSource: string;
		readonly archiveBase64: string;
	};
	export default content;
}

interface SetHTMLOptions {
	sanitizer?: "default" | SanitizerConfig | SanitizerPresets;
}

interface Element {
	setHTML(html: string, options?: SetHTMLOptions): void;
	setHTMLUnsafe(html: string): void;
}

interface ShadowRoot {
	setHTML(html: string, options?: SetHTMLOptions): void;
	setHTMLUnsafe(html: string): void;
}
