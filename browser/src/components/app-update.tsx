// ABOUTME: Announces a downloaded application update in the shared browser chrome.
// ABOUTME: Lets the student postpone it or explicitly reload into the waiting version.

import { Button } from "@base-ui/react/button";

export function AppUpdate({
	isPostponed,
	onApply,
	onPostpone,
}: {
	isPostponed: boolean;
	onApply: () => void;
	onPostpone: () => void;
}) {
	return (
		<section aria-label="Application update" className="application-update">
			<p role="status">
				{isPostponed
					? "The update will wait until you reload."
					: "An application update is ready."}
			</p>
			<Button className="application-button" onClick={onApply}>
				Update and reload
			</Button>
			{!isPostponed && (
				<Button className="application-button" onClick={onPostpone}>
					Continue working
				</Button>
			)}
		</section>
	);
}
