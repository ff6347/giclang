// ABOUTME: Provides progressive enhancement for optional wishes and submit navigation.
// ABOUTME: Keeps the ordinary HTML questionnaire usable when JavaScript is unavailable.

const wishes = document.querySelector("#wishes");
const template = document.querySelector("#wish-template");
const addWish = document.querySelector("#add-wish");
const form = document.querySelector("form[action='/submit']");

if (wishes instanceof HTMLElement && template instanceof HTMLTemplateElement) {
	const rows = Array.from(wishes.querySelectorAll(".wish-row"));
	for (const row of rows.slice(1)) {
		const fields = row.querySelectorAll("input");
		if (Array.from(fields).every((field) => field.value === "")) row.remove();
	}

	const updateAddWish = () => {
		if (addWish instanceof HTMLButtonElement)
			addWish.disabled = wishes.querySelectorAll(".wish-row").length >= 20;
	};

	addWish?.addEventListener("click", () => {
		if (wishes.querySelectorAll(".wish-row").length >= 20) return;
		wishes.append(template.content.cloneNode(true));
		updateAddWish();
	});
	updateAddWish();
}

if (form instanceof HTMLFormElement) {
	form.addEventListener("submit", () => {
		const button = form.querySelector("button[type='submit']");
		if (button instanceof HTMLButtonElement) button.disabled = true;
	});

	window.addEventListener("pageshow", () => {
		const button = form.querySelector("button[type='submit']");
		if (button instanceof HTMLButtonElement) button.disabled = false;
	});
}
