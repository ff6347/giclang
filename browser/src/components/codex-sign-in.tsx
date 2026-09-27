// ABOUTME: Presents the desktop Codex device authorization and account controls.
// ABOUTME: Uses a fixed OpenAI verification address and never renders credentials.

import { Button, Field } from "@base-ui/react";
import { useEffect, useRef, useState } from "react";
import {
	beginCodexSignIn,
	receiveCodexAuthEvent,
	type CodexSignInState,
} from "../lib/codex-auth.ts";
import type {
	DesktopHost,
	ProviderCredentialStatus,
} from "../lib/desktop-host.ts";

const OPENAI_DEVICE_VERIFICATION_URL = "https://auth.openai.com/codex/device";

export function CodexSignIn({
	desktop,
	authenticated,
	onProviderAuthenticated,
}: {
	readonly desktop: DesktopHost;
	readonly authenticated: boolean;
	readonly onProviderAuthenticated: (status: ProviderCredentialStatus) => void;
}) {
	const [signIn, setSignIn] = useState<CodexSignInState>({ kind: "idle" });
	const [copied, setCopied] = useState(false);
	const [listenerReady, setListenerReady] = useState(false);
	const onProviderAuthenticatedRef = useRef(onProviderAuthenticated);
	onProviderAuthenticatedRef.current = onProviderAuthenticated;
	const completedAttemptId =
		signIn.kind === "complete" || signIn.kind === "cancelled"
			? signIn.attemptId
			: undefined;

	useEffect(() => {
		let disposed = false;
		let unlisten: (() => void) | undefined;
		setListenerReady(false);
		void desktop
			.onCodexAuthEvent((event) => {
				if (!disposed) {
					setSignIn((current) => receiveCodexAuthEvent(current, event));
				}
			})
			.then((stopListening) => {
				if (disposed) {
					stopListening();
					return;
				}
				unlisten = stopListening;
				setListenerReady(true);
			})
			.catch(() => {
				if (!disposed) setSignIn({ kind: "error" });
			});
		return () => {
			disposed = true;
			unlisten?.();
		};
	}, [desktop]);

	useEffect(() => {
		if (signIn.kind !== "complete" && signIn.kind !== "cancelled") return;
		void desktop
			.providerCredentialStatus()
			.then(onProviderAuthenticatedRef.current)
			.catch(() => undefined);
	}, [desktop, completedAttemptId, signIn.kind]);

	const start = () => {
		setCopied(false);
		setSignIn(beginCodexSignIn());
		void desktop.startCodexLogin().catch(() => {
			setSignIn({ kind: "error" });
		});
	};
	const refreshCredentialStatus = () =>
		desktop.providerCredentialStatus().then(onProviderAuthenticated);
	const cancel = () => {
		void desktop.cancelCodexLogin().catch(() => {
			setSignIn({ kind: "error" });
		});
	};
	const signOut = () => {
		void desktop
			.signOutCodex()
			.then(() => {
				setSignIn({ kind: "idle" });
				return refreshCredentialStatus();
			})
			.catch(() => {
				setSignIn({ kind: "error" });
			});
	};
	const switchAccount = () => {
		void desktop
			.signOutCodex()
			.then(() => refreshCredentialStatus())
			.then(start)
			.catch(() => {
				setSignIn({ kind: "error" });
			});
	};
	const copyCode = () => {
		if (signIn.kind !== "deviceAuthorization") return;
		void navigator.clipboard
			.writeText(signIn.userCode)
			.then(() => setCopied(true))
			.catch(() => setCopied(false));
	};

	return (
		<>
			<h2>Codex</h2>
			{authenticated ? (
				<>
					<p role="status">Signed in to Codex.</p>
					<Button
						className="application-button"
						type="button"
						onClick={signOut}
					>
						Sign out of Codex
					</Button>
					<Button
						className="application-button"
						type="button"
						onClick={switchAccount}
						disabled={!listenerReady}
					>
						Switch Codex account
					</Button>
				</>
			) : (
				<>
					<p className="settings-help">
						Sign in with your Codex subscription using OpenAI device
						verification.
					</p>
					<Button
						className="application-button"
						type="button"
						onClick={start}
						disabled={!listenerReady}
					>
						Sign in to Codex
					</Button>
				</>
			)}
			{signIn.kind === "starting" && (
				<p role="status">Starting Codex sign-in…</p>
			)}
			{signIn.kind === "deviceAuthorization" && (
				<>
					<p role="status">
						Open the OpenAI verification page, then enter this one-time code.
					</p>
					<p>
						<a
							href={OPENAI_DEVICE_VERIFICATION_URL}
							target="_blank"
							rel="noreferrer"
						>
							OpenAI device verification
						</a>
					</p>
					<Field.Root className="settings-row">
						<Field.Label>One-time code</Field.Label>
						<Field.Control
							aria-label="Codex one-time code"
							className="application-input"
							readOnly
							value={signIn.userCode}
						/>
					</Field.Root>
					<Button
						className="application-button"
						type="button"
						onClick={copyCode}
					>
						{copied ? "Code copied" : "Copy code"}
					</Button>
					<Button className="application-button" type="button" onClick={cancel}>
						Cancel sign-in
					</Button>
				</>
			)}
			{signIn.kind === "cancelled" && (
				<p role="status">Codex sign-in cancelled.</p>
			)}
			{signIn.kind === "error" && (
				<p role="alert">Codex sign-in could not be completed. Try again.</p>
			)}
		</>
	);
}
