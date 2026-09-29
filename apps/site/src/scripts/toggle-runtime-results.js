document.addEventListener("DOMContentLoaded", () => {
	const diagnostics = document.getElementById("diagnostics");
	const output = document.getElementById("output");
	const diagnosticsHeading = document.getElementById("diagnostics-heading");
	const outputHeading = document.getElementById("output-heading");

	function watchResults(element, heading) {
		function update() {
			const hasContent = element.textContent.trim().length > 0;
			const wasHidden = heading.classList.contains("hidden");

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
