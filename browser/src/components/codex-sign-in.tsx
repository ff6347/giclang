// ABOUTME: Presents the desktop Codex device authorization and account controls.
// ABOUTME: Uses a fixed OpenAI verification address and never renders credentials.

import { Button, Field } from "@base-ui/react";
import { useEffect, useRef, useState } from "react";
import {
	beginCodexSignIn,
	canBeginCodexAction,
	isCodexSignInActive,
	receiveCodexAuthEvent,
	type CodexAccountAction,
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
	const [verificationError, setVerificationError] = useState(false);
	const [listenerReady, setListenerReady] = useState(false);
	const [activeAction, setActiveAction] = useState<
		CodexAccountAction | undefined
	>();
	const activeActionRef = useRef<CodexAccountAction | undefined>(undefined);
	const generationRef = useRef(0);
	const loginGenerationRef = useRef(0);
	const onProviderAuthenticatedRef = useRef(onProviderAuthenticated);
	onProviderAuthenticatedRef.current = onProviderAuthenticated;
	const completedAttemptId =
		signIn.kind === "complete" || signIn.kind === "cancelled"
			? signIn.attemptId
			: undefined;

	useEffect(() => {
		let disposed = false;
		let unlisten: (() => void) | undefined;
		generationRef.current += 1;
		loginGenerationRef.current = generationRef.current;
		activeActionRef.current = undefined;
		setActiveAction(undefined);
		setListenerReady(false);
		void desktop
			.onCodexAuthEvent((event) => {
				if (!disposed && loginGenerationRef.current === generationRef.current) {
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
		if (
			signIn.kind === "deviceAuthorization" ||
			signIn.kind === "complete" ||
			signIn.kind === "cancelled" ||
			signIn.kind === "error"
		) {
			if (
				activeActionRef.current === "start" ||
				activeActionRef.current === "cancel" ||
				activeActionRef.current === "switchAccount"
			) {
				activeActionRef.current = undefined;
				setActiveAction(undefined);
			}
		}
	}, [signIn.kind]);

	useEffect(() => {
		if (signIn.kind !== "complete" && signIn.kind !== "cancelled") return;
		const generation = generationRef.current;
		void desktop
			.providerCredentialStatus()
			.then((status) => {
				if (generationRef.current === generation) {
					onProviderAuthenticatedRef.current(status);
				}
			})
			.catch(() => undefined);
	}, [desktop, completedAttemptId, signIn.kind]);

	const beginAction = (action: CodexAccountAction) => {
		if (!canBeginCodexAction(activeActionRef.current)) return undefined;
		const generation = generationRef.current + 1;
		generationRef.current = generation;
		activeActionRef.current = action;
		setActiveAction(action);
		return generation;
	};
	const finishAction = (action: CodexAccountAction, generation: number) => {
		if (
			generationRef.current !== generation ||
			activeActionRef.current !== action
		) {
			return;
		}
		activeActionRef.current = undefined;
		setActiveAction(undefined);
	};
	const isCurrentGeneration = (generation: number) =>
		generationRef.current === generation;
	const startLogin = (generation: number) => {
		if (!isCurrentGeneration(generation)) return;
		loginGenerationRef.current = generation;
		setCopied(false);
		setVerificationError(false);
		setSignIn(beginCodexSignIn());
		void desktop.startCodexLogin().catch(() => {
			if (isCurrentGeneration(generation)) {
				setSignIn((current) =>
					isCodexSignInActive(current) ? { kind: "error" } : current,
				);
				finishAction("start", generation);
				finishAction("switchAccount", generation);
			}
		});
	};
	const start = () => {
		if (isCodexSignInActive(signIn)) return;
		const generation = beginAction("start");
		if (generation !== undefined) startLogin(generation);
	};
	const refreshCredentialStatus = (generation: number) =>
		desktop.providerCredentialStatus().then((status) => {
			if (isCurrentGeneration(generation)) {
				onProviderAuthenticatedRef.current(status);
			}
		});
	const cancel = () => {
		const generation = beginAction("cancel");
		if (generation === undefined) return;
		void desktop.cancelCodexLogin().catch(() => {
			if (isCurrentGeneration(generation)) {
				setSignIn({ kind: "error" });
				finishAction("cancel", generation);
			}
		});
	};
	const signOut = () => {
		const generation = beginAction("signOut");
		if (generation === undefined) return;
		loginGenerationRef.current = generation;
		setSignIn({ kind: "idle" });
		void desktop
			.signOutCodex()
			.then(() => {
				if (!isCurrentGeneration(generation)) return;
				return refreshCredentialStatus(generation);
			})
			.catch(() => {
				if (isCurrentGeneration(generation)) setSignIn({ kind: "error" });
			})
			.finally(() => {
				finishAction("signOut", generation);
			});
	};
	const switchAccount = () => {
		const generation = beginAction("switchAccount");
		if (generation === undefined) return;
		loginGenerationRef.current = generation;
		setSignIn({ kind: "idle" });
		void desktop
			.signOutCodex()
			.then(() => refreshCredentialStatus(generation))
			.then(() => startLogin(generation))
			.catch(() => {
				if (isCurrentGeneration(generation)) {
					setSignIn({ kind: "error" });
					finishAction("switchAccount", generation);
				}
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
			<h3>Codex</h3>
			{authenticated ? (
				<>
					<p role="status">Signed in to Codex.</p>
					<Button
						className="application-button"
						type="button"
						onClick={signOut}
						disabled={activeAction !== undefined || isCodexSignInActive(signIn)}
					>
						Sign out of Codex
					</Button>
					<Button
						className="application-button"
						type="button"
						onClick={switchAccount}
						disabled={
							!listenerReady ||
							activeAction !== undefined ||
							isCodexSignInActive(signIn)
						}
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
						disabled={
							!listenerReady ||
							activeAction !== undefined ||
							isCodexSignInActive(signIn)
						}
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
							onClick={(event) => {
								event.preventDefault();
								setVerificationError(false);
								void desktop
									.openCodexVerification()
									.catch(() => setVerificationError(true));
							}}
						>
							OpenAI device verification
						</a>
					</p>
					{verificationError && (
						<p role="alert">
							Could not open your browser. Visit{" "}
							{OPENAI_DEVICE_VERIFICATION_URL} manually.
						</p>
					)}
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
						disabled={!listenerReady || activeAction !== undefined}
					>
						{copied ? "Code copied" : "Copy code"}
					</Button>
					<Button
						className="application-button"
						type="button"
						onClick={cancel}
						disabled={!listenerReady || activeAction !== undefined}
					>
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
