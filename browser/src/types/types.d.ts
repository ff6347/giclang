// ABOUTME: Declares the sanitized HTML APIs used for browser diagnostics.
// ABOUTME: Extends Element and ShadowRoot with their HTML replacement methods.

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
