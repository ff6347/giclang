// ABOUTME: Registers the production service worker and exposes waiting updates.
// ABOUTME: Keeps activation behind an explicit student action.

import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export function useAppUpdate() {
	const [isPostponed, setIsPostponed] = useState(false);
	const [isWaiting, setIsWaiting] = useState(false);
	const updateServiceWorker = useRef<UpdateServiceWorker>(async () => {});

	useEffect(() => {
		updateServiceWorker.current = registerSW({
			immediate: true,
			onNeedRefresh() {
				setIsPostponed(false);
				setIsWaiting(true);
			},
			onRegisterError(error) {
				console.error("Unable to prepare offline use.", error);
			},
		});
	}, []);

	return {
		applyUpdate() {
			void updateServiceWorker.current(true);
		},
		isPostponed,
		isWaiting,
		postponeUpdate() {
			setIsPostponed(true);
		},
	};
}
