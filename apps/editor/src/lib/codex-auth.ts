// ABOUTME: Defines browser state for a Codex device authorization attempt.
// ABOUTME: Correlates native authorization events without retaining credentials.

import type { CodexAuthEvent } from "./desktop-host.ts";

export type CodexSignInState =
	| { readonly kind: "idle" }
	| { readonly kind: "starting" }
	| {
			readonly kind: "deviceAuthorization";
			readonly attemptId: number;
			readonly userCode: string;
	  }
	| { readonly kind: "complete"; readonly attemptId: number }
	| { readonly kind: "cancelled"; readonly attemptId: number }
	| { readonly kind: "error"; readonly attemptId?: number };

export type CodexAccountAction =
	| "start"
	| "cancel"
	| "signOut"
	| "switchAccount";

export function beginCodexSignIn(): CodexSignInState {
	return { kind: "starting" };
}

export function canBeginCodexAction(
	activeAction: CodexAccountAction | undefined,
): boolean {
	return activeAction === undefined;
}

export function isCodexSignInActive(state: CodexSignInState): boolean {
	return state.kind === "starting" || state.kind === "deviceAuthorization";
}

export function receiveCodexAuthEvent(
	state: CodexSignInState,
	event: CodexAuthEvent,
): CodexSignInState {
	if (event.kind === "deviceAuthorization") {
		if (
			state.kind !== "starting" &&
			(state.kind !== "deviceAuthorization" ||
				state.attemptId !== event.attemptId)
		) {
			return state;
		}
		return {
			kind: "deviceAuthorization",
			attemptId: event.attemptId,
			userCode: event.userCode,
		};
	}

	if (
		state.kind !== "deviceAuthorization" ||
		state.attemptId !== event.attemptId
	) {
		return state;
	}

	if (event.kind === "complete") {
		return { kind: "complete", attemptId: event.attemptId };
	}
	if (event.kind === "cancelled") {
		return { kind: "cancelled", attemptId: event.attemptId };
	}
	return { kind: "error", attemptId: event.attemptId };
}
