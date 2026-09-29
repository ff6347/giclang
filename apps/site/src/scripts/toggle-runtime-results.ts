document.addEventListener("DOMContentLoaded", () => {
	const diagnostics = document.getElementById("diagnostics");
	const output = document.getElementById("output");
	const diagnosticsHeading = document.getElementById("diagnostics-heading");
	const outputHeading = document.getElementById("output-heading");

	if (!diagnostics || !output || !diagnosticsHeading || !outputHeading) {
		return;
	}

	function watchResults(element: HTMLElement, heading: HTMLElement): void {
		function update() {
			const hasContent = element.textContent.trim().length > 0;

			heading.classList.toggle("hidden", !hasContent);

			// if (hasContent && wasHidden) {
			// 	// element.scrollIntoView();
			// }
		}

		new MutationObserver(update).observe(element, {
			childList: true,
			characterData: true,
			subtree: true,
		});

		update();
	}

	watchResults(diagnostics, diagnosticsHeading);
	watchResults(output, outputHeading);
});
