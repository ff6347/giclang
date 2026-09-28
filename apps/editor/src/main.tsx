// ABOUTME: Mounts the React browser application into the shared IDE page.
// ABOUTME: Keeps browser startup separate from workspace and preview behavior.

import { createRoot } from "react-dom/client";
import { App } from "./components/app.tsx";
import { createApplicationHost } from "./lib/application-host.ts";
import "@giclang/styles/tokens.css";
import "./styles.css";

const root = document.querySelector("#app");
if (!(root instanceof HTMLElement)) {
	throw new Error("#app not found");
}

const host = await createApplicationHost();
createRoot(root).render(
	<App
		desktop={host.desktop}
		settings={host.settings}
		supportsAppUpdates={host.supportsAppUpdates}
	/>,
);
