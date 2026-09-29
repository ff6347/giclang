// ABOUTME: Owns exclusive native document activation transactions.
// ABOUTME: Prevents overlapping acceptance commands and ownerless busy cleanup.

export type ActivationLease = symbol;

export class DocumentActivation {
	#owner: ActivationLease | undefined;

	get isPending(): boolean {
		return this.#owner !== undefined;
	}

	acquire(): ActivationLease | undefined {
		if (this.#owner !== undefined) return undefined;
		const lease = Symbol("document-activation");
		this.#owner = lease;
		return lease;
	}

	release(lease: ActivationLease): boolean {
		if (this.#owner !== lease) return false;
		this.#owner = undefined;
		return true;
	}
}
